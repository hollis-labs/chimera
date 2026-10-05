import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'
import { chromium } from 'playwright'
import { buildFrameArtifacts, buildFrameBootstrap } from '@hollis-labs/plugin-host-ui/vite'
import { artifactModuleUrl } from '@hollis-labs/plugin-host-ui/isolation'
const root = dirname(dirname(fileURLToPath(import.meta.url)))
const scratchRoot=join(root,'..','.scratch','upstream-frame-browser');await mkdir(scratchRoot,{recursive:true});process.env.TMPDIR=scratchRoot
const scratch = await mkdtemp(join(scratchRoot,'run-'))
let browser, server
const docs = new Map(), requests = [], proofs = []
try {
  const ui = join(scratch, 'ui.js')
  await writeFile(ui, 'import { createElement, useState } from "react"; export function FrameButton({label}) { const [count,setCount] = useState(0); return createElement("button",{onClick:()=>setCount(count+1)},label+":"+count) }')
  const entries = []
  for (const specifier of ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime']) {
    const module = await import(specifier)
    entries.push({ specifier, source: specifier, exports: Object.keys(module).filter(name => name !== 'default' && /^[A-Za-z_$][\w$]*$/.test(name)), defaultExport: Object.hasOwn(module, 'default') })
  }
  entries.push({ specifier: '@fixture/ui', source: ui, exports: ['FrameButton'] })
  const inventory = await buildFrameArtifacts({ entries, root })
  const bootstrap = await buildFrameBootstrap()
  const plugin = `import { createElement, useState } from 'react'; import {FrameButton} from '@fixture/ui';
export function View({label}) { return createElement(FrameButton, {label}); } View.hook=useState;
globalThis.pluginHook=useState; globalThis.pluginParentReadable=(()=>{try{return !!parent.document.body}catch{return false}})();
globalThis.pluginStorageReadable=(()=>{try{return !!localStorage.getItem('secret')}catch{return false}})();
globalThis.pluginCookieReadable=(()=>{try{return document.cookie.includes('secret')}catch{return false}})();
globalThis.pluginProof='exact-pinned-bytes';`
  const fixture = { ...inventory, bootstrap, plugin }
  const output = await build({ root, configFile: false, logLevel: 'silent', build: { write: false, minify: false, target: 'es2022',
    lib: { entry: join(root, 'upstream-frame-browser/client.ts'), formats: ['es'] }, rollupOptions: { external: entries.map(entry => entry.specifier), output: { inlineDynamicImports: true } },
  } })
  const hostOutput = Array.isArray(output) ? output[0] : output
  const client = hostOutput.output.find(item => item.type === 'chunk').code
  const imports = Object.fromEntries(inventory.imports.map(row => [row.specifier, artifactModuleUrl(inventory.artifacts.find(artifact => artifact.id === row.artifact), 'app')]))
  server = createServer(async (req, res) => {
    requests.push({ path: req.url, method: req.method })
    if (req.url === '/documents' && req.method === 'POST') {
      let body = ''; for await (const chunk of req) { body += chunk; if (body.length > 2_000_000) { res.writeHead(413).end(); return } }
      const doc = JSON.parse(body); docs.set(doc.frameId, doc); res.writeHead(204).end(); return
    }
    if (req.url.startsWith('/frame/')) {
      const id = req.url.slice('/frame/'.length), doc = docs.get(id)
      if (req.method === 'DELETE') { docs.delete(id); res.writeHead(204).end(); return }
      if (!doc) { res.writeHead(404).end(); return }
      res.writeHead(200, { 'Content-Type': 'text/html', 'Content-Security-Policy': doc.csp, 'Permissions-Policy': doc.permissionsPolicy, 'Referrer-Policy': 'no-referrer' }).end(doc.html); return
    }
    if (req.url === '/fixture') { res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(fixture)); return }
    if (req.url === '/client.js') { res.writeHead(200, { 'Content-Type': 'text/javascript' }).end(client); return }
    if (req.url === '/') { res.writeHead(200, { 'Content-Type': 'text/html', 'Set-Cookie': 'secret=parent; SameSite=Strict' }).end(`<!doctype html><html><head><script type="importmap">${JSON.stringify({ imports }).replaceAll('<', '\\u003c')}</script></head><body><button id="parent-focus">Parent focus</button><div id="main-view"></div><script type="module" src="/client.js"></script></body></html>`); return }
    if (req.url === '/changed-plugin.js') { res.writeHead(200, { 'Content-Type': 'text/javascript' }).end('throw new Error("changed URL executed")'); return }
    res.writeHead(200).end('egress observed')
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const origin = `http://127.0.0.1:${server.address().port}`
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH, headless: true })
  const context = await browser.newContext({ acceptDownloads: false })
  await context.addInitScript(() => {
    const add = EventTarget.prototype.addEventListener, remove = EventTarget.prototype.removeEventListener, wrappers = new WeakMap()
    EventTarget.prototype.addEventListener = function (type, listener, options) {
      if (this !== window || type !== 'message' || typeof listener !== 'function') return add.call(this, type, listener, options)
      const wrapped = function (event) {
        if (event.data?.type === (window === top ? 'ready-window' : 'bind-window')) {
          for (const mutation of ['source', 'origin', 'nonce', 'port', 'version', 'schema']) {
            const data = { ...event.data }, ports = window === top ? [] : [new MessageChannel().port1]
            let source = event.source, origin = event.origin
            if (mutation === 'source') source = window
            if (mutation === 'origin') origin = 'https://wrong-origin.invalid'
            if (mutation === 'nonce') data.nonce = '0'.repeat(64)
            if (mutation === 'port') ports.push(new MessageChannel().port1)
            if (mutation === 'version') data.bridge_version = 2
            if (mutation === 'schema') data.extra = true
            listener.call(this, new MessageEvent('message', { data, source, origin, ports }))
            globalThis.fixtureWindowRejections = (globalThis.fixtureWindowRejections ?? 0) + 1
          }
        }
        return listener.call(this, event)
      }
      wrappers.set(listener, wrapped); return add.call(this, type, wrapped, options)
    }
    EventTarget.prototype.removeEventListener = function (type, listener, options) { return remove.call(this, type, wrappers.get(listener) ?? listener, options) }
    if (window === top) return
    const send = MessagePort.prototype.postMessage
    MessagePort.prototype.postMessage = function (packet, ...rest) { globalThis.fixturePort = this; globalThis.fixturePacket = packet; return send.call(this, packet, ...rest) }
  })
  const page = await context.newPage(), errors = []; let downloads = 0, popups = 0
  page.on('download', () => downloads++); page.on('popup', () => popups++)
  page.on('pageerror', error => { errors.push(error.message); console.error('PAGE ERROR:', error.message) })
  await page.goto(origin); await page.waitForFunction(() => !!globalThis.fixtureHost)
  await page.evaluate(() => localStorage.setItem('secret', 'parent'))
  const call = (method, ...args) => page.evaluate(({ method, args }) => globalThis.fixtureHost[method](...args), { method, args })
  assert.equal((await call('load')).registryResult.accepted, true)
  const info = await call('info')
  assert.equal(info.frames, 0, 'verification realm must be disposed before returning adoption handles')
  assert.equal(info.views.find(v => v.key === 'first').frozen, true)
  assert.equal(info.views.find(v => v.key === 'first').callable, false)
  assert.equal(info.views.find(v => v.key === 'missing').available, 'unavailable')
  assert.equal(await call('spoofHandle'), false)
  proofs.push('frame-confirmed inert namespace; missing exports unavailable; forged handles refused')
  const first = await call('mount'), second = await call('mount', 'second')
  await page.waitForFunction(({ first, second }) => globalThis.fixtureHost.state(first).status === 'ready' && globalThis.fixtureHost.state(second).status === 'ready', { first, second }, { timeout: 15_000 })
  const frames = page.frames().filter(frame => frame !== page.mainFrame()), a = frames[0], b = frames[1]
  await a.getByRole('button', { name: 'verified:0' }).click(); assert.equal(await a.getByRole('button').textContent(), 'verified:1')
  assert.equal(await b.getByRole('button').textContent(), 'verified:0')
  const containment = await a.evaluate(() => ({ parent: globalThis.pluginParentReadable, storage: globalThis.pluginStorageReadable, cookie: globalThis.pluginCookieReadable, exact: globalThis.pluginProof }))
  assert.deepEqual(containment, { parent: false, storage: false, cookie: false, exact: 'exact-pinned-bytes' })
  assert.equal(requests.filter(req => req.path === '/changed-plugin.js').length, 0)
  assert.ok(await page.evaluate(() => globalThis.fixtureWindowRejections >= 6)); assert.ok(await a.evaluate(() => globalThis.fixtureWindowRejections >= 6))
  proofs.push('window bootstrap rejects wrong source/origin/nonce/port/version/schema before legitimate binding')
  proofs.push('per-frame React/design exports mount; independent realms; exact bytes with changed source URL; opaque DOM/storage/cookie denial')
  const result = await a.evaluate(() => globalThis.pluginFrame.invoke('run', { type: 'command', command: 'tools/run', arguments: {} }))
  assert.deepEqual(result, { status: 'success' }); assert.equal((await call('info')).executionCount, 1)
  assert.equal((await a.evaluate(() => globalThis.pluginFrame.invoke('undeclared', { type: 'command', command: 'tools/run', arguments: {} }))).status, 'refused')
  await call('setAllowed', false)
  assert.equal((await a.evaluate(() => globalThis.pluginFrame.invoke('run', { type: 'command', command: 'tools/run', arguments: {} }))).reason, 'denied')
  assert.equal((await call('info')).executionCount, 1); await call('setAllowed', true)
  proofs.push('permitted typed action once; undeclared/ungranted actions zero adapter effects')
  await call('setHold', true)
  await a.evaluate(() => { globalThis.waiting = globalThis.pluginFrame.invoke('run', { type: 'command', command: 'tools/run', arguments: {} }) })
  await page.waitForFunction(() => globalThis.fixtureHost.info().executionCount === 2)
  await call('changeInvocation')
  assert.equal((await a.evaluate(() => globalThis.waiting)).status, 'unknown-outcome')
  await call('complete'); await call('setHold', false)
  assert.ok((await call('info')).events.includes('adapter-aborted'))
  proofs.push('invocation change cancels adapter; late committed effect is unknown-outcome without retry')
  for (const change of ['changeScope', 'unloadTarget']) {
    await call('setHold', true)
    const count = (await call('info')).executionCount
    await a.evaluate(() => { globalThis.waiting = globalThis.pluginFrame.invoke('run', { type: 'command', command: 'tools/run', arguments: {} }) })
    await page.waitForFunction(count => globalThis.fixtureHost.info().executionCount === count + 1, count)
    await call(change)
    assert.equal((await a.evaluate(() => globalThis.waiting)).status, 'unknown-outcome')
    await call('complete'); await call('setHold', false); await call('restoreScope')
  }
  proofs.push('scope and target unload abort active calls; late effects remain uncertain')
  const modalResult = await a.evaluate(() => globalThis.pluginFrame.invoke('open', { type: 'modal', region: 'modal.body', entry: { owner_id: 'notes', local_key: 'modal-target' }, props: {} }))
  assert.equal(modalResult.status, 'success'); await page.getByRole('dialog').waitFor(); await page.getByRole('button', { name: 'Close parent modal' }).click()
  assert.equal(await page.getByRole('dialog').count(), 0)
  proofs.push('reviewed modal action opens and closes a parent-owned focus shell')
  const oldPacket = await a.evaluate(() => globalThis.fixturePacket)
  const before = requests.length
  const network = await a.evaluate(async url => {
    const results = []
    try { await fetch(url + '/blocked-fetch'); results.push('fetch-allowed') } catch { results.push('fetch-denied') }
    const image = new Image(); image.src = url + '/blocked-image'; document.body.append(image)
    const form = document.createElement('form'); form.action = url + '/blocked-form'; document.body.append(form); form.submit()
    results.push(window.open(url + '/blocked-popup') === null ? 'popup-denied' : 'popup-opened')
    try { top.location.href = url + '/blocked-top'; results.push('top-allowed') } catch { results.push('top-denied') }
    const link = document.createElement('a'); link.download = 'blocked'; link.href = 'data:text/plain,blocked'; document.body.append(link); link.click()
    return results
  }, origin)
  await page.waitForTimeout(100)
  assert.deepEqual(network, ['fetch-denied', 'popup-denied', 'top-denied'])
  assert.equal(requests.slice(before).some(req => req.path.startsWith('/blocked-')), false)
  assert.equal(page.url(), origin + '/'); assert.equal(downloads, 0); assert.equal(popups, 0)
  proofs.push('fetch/subresource/forms/popups/downloads/top-navigation denied under fixed sandbox/CSP')
  await page.locator('#parent-focus').focus(); assert.equal(await page.locator('#parent-focus').evaluate(node => node === document.activeElement), true)
  await a.getByRole('button').focus(); await page.keyboard.press('Tab')
  assert.equal(await page.locator('iframe').count(), 2)
  proofs.push('parent owns focus shell; frame retains keyboard focus without parent DOM access')
  await call('disposeSurface', first)
  assert.equal(await b.getByRole('button').textContent(), 'verified:0')
  await call('update', second, 'updated'); await b.getByRole('button', { name: 'updated:0' }).waitFor()
  proofs.push('one surface disposal preserves sibling inventory/runtime; filtered context updates independently')
  const replayTarget = await call('mount')
  await page.waitForFunction(index => globalThis.fixtureHost.state(index).status === 'ready', replayTarget)
  let replayFrame = page.frames().filter(frame => frame !== page.mainFrame()).at(-1)
  await replayFrame.evaluate(packet => globalThis.fixturePort.postMessage(packet), oldPacket)
  await page.waitForFunction(index => globalThis.fixtureHost.state(index).status === 'failed', replayTarget)
  proofs.push('sibling/remount replay rejected by fresh frame/nonce/sequence pins')
  for (const mutation of ['nonce', 'version', 'schema', 'port']) {
    const index = await call('mount'); await page.waitForFunction(index => globalThis.fixtureHost.state(index).status === 'ready', index)
    replayFrame = page.frames().filter(frame => frame !== page.mainFrame()).at(-1)
    await replayFrame.evaluate(mutation => {
      const config = JSON.parse(document.getElementById('plugin-frame-config').textContent)
      const packet = { bridge_version: 1, frame_id: config.frame_id, nonce: config.nonce, seq: 100, type: 'invoke', id: '1', binding: 'run', intent: { type: 'command', command: 'tools/run', arguments: {} } }
      if (mutation === 'nonce') packet.nonce = '0'.repeat(64)
      if (mutation === 'version') packet.bridge_version = 2
      if (mutation === 'schema') packet.extra = true
      globalThis.fixturePort.postMessage(JSON.stringify(packet), mutation === 'port' ? [new MessageChannel().port1] : [])
    }, mutation)
    await page.waitForFunction(index => globalThis.fixtureHost.state(index).status === 'failed', index)
  }
  assert.equal((await call('info')).executionCount, 4)
  proofs.push('wrong nonce/version/schema/transferred port revoke without adapter effects')
  await call('failCleanup', true); await call('revoke'); await call('failCleanup', false)
  assert.equal(await page.locator('iframe').count(), 0); assert.ok((await call('info')).events.includes('cleanup-incomplete'))
  proofs.push('cleanup failure is reported after authority/ports/frames are fenced')
  await call('load', 'sandboxed-frame'); const modeSurface = await call('mount')
  await page.waitForFunction(index => globalThis.fixtureHost.state(index).status === 'ready', modeSurface)
  assert.equal(await page.locator('iframe').count(), 1)
  await call('load', 'main-origin')
  assert.equal(await page.locator('iframe').count(), 0)
  assert.equal(await call('oldIsCurrent'), false)
  assert.equal((await call('state', modeSurface)).status, 'failed')
  assert.equal(await call('mainSingleton'), true)
  await call('mainRender'); await page.getByRole('button', { name: 'main:0' }).waitFor()
  proofs.push('mode replacement fences old frames before main-origin; same-realm React singleton')
  await call('load', 'sandboxed-frame'); const replacement = await call('mount')
  await page.waitForFunction(index => globalThis.fixtureHost.state(index).status === 'ready', replacement)
  const fresh = page.frames().find(frame => frame !== page.mainFrame())
  await fresh.evaluate(url => { location.href = url + '/self-navigation' }, origin).catch(() => {})
  await page.waitForFunction(index => globalThis.fixtureHost.state(index).status === 'failed', replacement)
  assert.ok(requests.some(req => req.path === '/self-navigation'))
  proofs.push('self-navigation egress observed, then session revoked: explicitly not universal network denial')
  await call('shutdown')
  assert.equal(await page.locator('iframe').count(), 0)
  assert.deepEqual(errors, [])
  await context.close()
  for (const proof of proofs) console.log('PASS: ' + proof)
  console.log('Browser acceptance complete; expected policy-denial console errors are not application failures.')
} catch (error) { console.error('BROWSER PROOF FAILED:', error); throw error }
finally { await browser?.close(); if (server) await new Promise(resolve => server.close(resolve)); await rm(scratch, { recursive: true, force: true }) }
