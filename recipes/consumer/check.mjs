import {spawn,execFileSync} from 'node:child_process'
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {fileURLToPath} from 'node:url'
import {dirname,resolve} from 'node:path'
import {createHash} from 'node:crypto'
import assert from 'node:assert/strict'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..'),scratch=resolve(root,'.scratch'),tag=`consumer-proof-${Date.now()}`,captures=resolve(scratch,tag,'captures')
await mkdir(captures,{recursive:true})
const env={...process.env,TMPDIR:resolve(scratch,'tmp'),GOCACHE:resolve(scratch,'go-cache'),GOMODCACHE:resolve(scratch,'mod-cache'),GOWORK:'off',npm_config_cache:resolve(scratch,'npm-cache')}
const {chromium,expect}=await import(fileURLToPath(new URL('../../frontend/node_modules/@playwright/test/index.mjs',import.meta.url)))
function run(cmd,args,cwd,extra={}){return new Promise((yes,no)=>{const child=spawn(cmd,args,{cwd,env:{...env,...extra}});let log='';child.stdout.on('data',b=>log+=b);child.stderr.on('data',b=>log+=b);child.on('error',no);child.on('exit',code=>code===0?yes(log):no(Error(`${cmd} ${args.join(' ')} exit${code}\n${log}`)))})}
async function server(binary,base,check){
 const child=spawn(binary,['-addr','127.0.0.1:18543','-base',base],{env});let log='';child.stderr.on('data',b=>log+=b);const exited=new Promise(resolve=>child.on('exit',code=>resolve(code)))
 try{await expect.poll(async()=>{try{return(await fetch('http://127.0.0.1:18543/healthz')).status}catch{return 0}},{timeout:10000}).toBe(200);await check()}
 finally{child.kill('SIGINT');assert.equal(await exited,0,log);assert.match(log,/recipe stop after HTTP drain/)}
}
const baseline=JSON.parse(execFileSync('git',['show','389155313ee5b95f4125e64b61077ddf4257e3d6:frontend/package-lock.json'],{cwd:root})).packages
const report=[]
for(const variant of ['shell','plugin']){
 const name=`${tag}/${variant}`,target=resolve(scratch,name)
 await run('node',['recipes/consumer/materialize.mjs',variant,name],root)
 const lock=JSON.parse(await readFile(resolve(target,'frontend/package-lock.json'))),before=JSON.stringify(lock)
 for(const [key,entry]of Object.entries(lock.packages))if(key)assert.deepEqual(entry,baseline[key],`Drifting lock ${key}`)
 await writeFile(resolve(target,'npm-install.log'),await run('npm',['ci','--prefix','frontend'],target))
 assert.equal(JSON.stringify(JSON.parse(await readFile(resolve(target,'frontend/package-lock.json')))),before,'npm ci changed lock')
 if(variant==='shell')assert(!Object.keys(lock.packages).some(key=>/plugin-host-ui|plugin-registry|kit-code|kit-voice|kit-workflow|kit-account/.test(key)),'Shell optional dependency leakage')
 await run('go',['mod','tidy'],target)
 const graph=JSON.parse(await run('go',['list','-m','-json','github.com/hollis-labs/chimera'],target));assert.equal(graph.Version,'v0.0.0-20261008115211-389155313ee5');assert.equal(graph.Sum,'h1:2JzG7PC8650ivo7aKSITaquRaBHJsWmffxKzxffzXN8=');assert(!/replace\s/.test(await readFile(resolve(target,'go.mod'),'utf8')))
 await run('go',['build','-o','placeholder','.'],target)
 await server(resolve(target,'placeholder'),'/review',async()=>{assert.equal((await fetch('http://127.0.0.1:18543/review/')).status,200);assert((await(await fetch('http://127.0.0.1:18543/review/')).text()).length>0);assert.equal((await fetch('http://127.0.0.1:18543/review/missing.js')).status,200);assert.equal((await(await fetch('http://127.0.0.1:18543/api/recipe')).json()).path,'/api/recipe')})
 await run('npm',['run','typecheck','--prefix','frontend'],target)
 const provenance=JSON.parse(await readFile(resolve(target,'recipe-provenance.json')))
 for(const record of provenance.adapters){const bytes=await readFile(resolve(target,record.local));assert.equal(createHash('sha256').update(bytes).digest('hex'),record.sha256)}
 for(const record of provenance.archives){assert.equal(createHash('sha256').update(await readFile(resolve(target,record.path))).digest('hex'),record.sha256)}
 for(const base of ['/','/review/']){
  await writeFile(resolve(target,base==='/'?'build-root.log':'build-review.log'),await run('npm',['run','build','--prefix','frontend'],target,{RECIPE_BASE:base}))
  const mode=base==='/'?'root':'review';await run('go',['build','-o',`app-${mode}`,'.'],target)
  await server(resolve(target,`app-${mode}`),base,async()=>{
   const origin='http://127.0.0.1:18543',browser=await chromium.launch({env})
   try{
    assert.equal((await fetch(origin+'/api/recipe')).status,200);assert.equal((await fetch(origin+base+'missing.js')).status,404)
    assert.equal((await fetch(origin+'/plugins/registry')).status,variant==='plugin'?200:404)
    assert.equal(await(await fetch(origin+base+'LICENSE-Chimera.txt')).text(),await readFile(resolve(target,'LICENSE'),'utf8'))
    if(variant==='plugin')assert.equal(await(await fetch(origin+base+'LICENSE-plugin-host-ui.txt')).text(),await readFile(resolve(target,'frontend/public/LICENSE-plugin-host-ui.txt'),'utf8'))
    for(const [width,height,label]of [[1280,720,'desktop'],[390,844,'narrow'],[390,480,'short']]){
     const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[],effects=[]
     page.on('pageerror',e=>errors.push(String(e)));page.on('request',r=>{if(r.method()!=='GET')effects.push(r.url());assert.equal(new URL(r.url()).origin,origin,'Unexpected external request')})
     await page.goto(origin+base);await expect(page.getByRole('heading',{name:'Published shell overview'})).toBeVisible()
     const viewport=await page.evaluate(()=>({width:innerWidth,doc:document.documentElement.scrollWidth,height:innerHeight,docHeight:document.documentElement.scrollHeight,background:getComputedStyle(document.querySelector('[class*="h-dvh"]')).backgroundColor,scroll:getComputedStyle(document.querySelector('.recipe-main')).overflowY}))
     assert(viewport.doc<=width+1&&viewport.docHeight<=height+1,JSON.stringify(viewport));assert.equal(viewport.scroll,'auto');assert(!['rgba(0, 0, 0, 0)','transparent'].includes(viewport.background))
     if(variant==='plugin'){
      const counter=page.getByRole('button',{name:'Reviewed widget local count 0'});await expect(counter).toBeVisible();await expect.poll(()=>counter.evaluate(el=>getComputedStyle(el).paddingTop)).toBe('28px')
      await counter.click();await expect(page.getByRole('button',{name:'Reviewed widget local count 1'})).toBeVisible()
      const map=await page.locator('script[type=importmap]').textContent();assert(map&&JSON.parse(map).imports.react&&JSON.parse(map).imports['@recipe/ui'])
     }
     const shot=variant==='shell'?mode==='root'&&label==='desktop'||mode==='review'&&label!=='desktop':mode==='root'&&label==='desktop'||mode==='review'&&label!=='desktop'
     if(shot)await page.screenshot({path:resolve(captures,`${variant}-${mode}-${label}.png`),fullPage:false})
     // Reach the native link using actual Tab traversal, then activate with Enter.
     await page.goto(origin+base);await expect(page.getByRole('heading',{name:'Published shell overview'})).toBeVisible()
     const nav=page.getByRole('navigation',{name:'Recipe destinations'}).getByRole('link',{name:'Evidence',exact:true})
     for(let i=0;i<12&&!(await nav.evaluate(el=>el===document.activeElement));i++)await page.keyboard.press('Tab')
     await expect(nav).toBeFocused();await page.keyboard.press('Enter');const heading=page.getByRole('heading',{name:'Readonly evidence',exact:true});await expect(heading).toBeFocused()
     const scroll=page.getByLabel('Recipe page scroll');await page.keyboard.press('Shift+Tab');await expect(scroll).toBeFocused();await page.keyboard.press('PageDown');await expect.poll(()=>scroll.evaluate(el=>el.scrollTop)).toBeGreaterThan(0)
     await page.keyboard.press('Control+End');await expect.poll(()=>scroll.evaluate(el=>el.scrollTop+el.clientHeight>=el.scrollHeight-2)).toBe(true);await expect(page.getByText('END OF FINITE EVIDENCE',{exact:false})).toBeInViewport();if(mode==='review'&&label==='short')await page.screenshot({path:resolve(captures,`${variant}-${mode}-${label}-evidence.png`),fullPage:false})
     const footer=await page.locator('.recipe-footer').boundingBox();assert(footer&&footer.y+footer.height<=height+1,'Pinned footer clipped')
     await page.keyboard.press('Tab');const back=page.getByRole('link',{name:'Return to overview'});await expect(back).toBeFocused();await page.keyboard.press('Enter');await expect(page.getByRole('heading',{name:'Published shell overview'})).toBeFocused()
     await page.goBack();await expect(heading).toBeVisible();await page.reload();await expect(heading).toBeVisible();await page.goto(origin+base+'details#overview');await expect(page.getByRole('heading',{name:'Published shell overview'})).toBeVisible()
     if(variant==='plugin'){
      const counter=page.getByRole('button',{name:'Reviewed widget local count 0'});await expect(counter).toBeVisible();const bg=await page.locator('.recipe-main').evaluate(el=>getComputedStyle(el).color)
      await expect(page.locator('link[href$="/plugins/recipe/g1/style.css"]')).toHaveCount(1);await page.getByRole('button',{name:'Unload reviewed widget'}).click();await expect(counter).toHaveCount(0);await expect(page.locator('link[href$="/plugins/recipe/g1/style.css"]')).toHaveCount(0);assert.equal(await page.locator('.recipe-main').evaluate(el=>getComputedStyle(el).color),bg)
     }
     assert.deepEqual(errors,[]);assert.deepEqual(effects,[]);await context.close();report.push({variant,base,width,height,passed:true})
    }
   }finally{await browser.close()}
  })
 }
}
const files=['shell-root-desktop.png','shell-review-narrow.png','shell-review-short.png','plugin-root-desktop.png','plugin-review-narrow.png','plugin-review-short.png','shell-review-short-evidence.png','plugin-review-short-evidence.png'],manifest=[]
for(const file of files)manifest.push(createHash('sha256').update(await readFile(resolve(captures,file))).digest('hex')+'  '+file)
await writeFile(resolve(captures,'captures.sha256'),manifest.join('\n')+'\n');await writeFile(resolve(scratch,tag,'acceptance.json'),JSON.stringify({cases:report,captures,publicGo:'389155313ee5b95f4125e64b61077ddf4257e3d6',baselinePinsPreserved:true},null,2)+'\n')
console.log(`12 native shell scenarios passed; two placeholder builds; four embedded root/subpath consumers. Evidence ${resolve(scratch,tag)}`)
