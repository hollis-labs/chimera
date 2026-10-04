import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe,it,expect } from 'vitest'
import { bundleDigest, type PluginRegistryResponse } from '@hollis-labs/plugin-registry'
import { createSlotCatalog, type HostScope, type AppIsolationSnapshot } from '@hollis-labs/plugin-host-ui'
import { createPresentationHost } from '../src/runtime.js'
import { readOnlyActions } from '../src/actions.js'
import { ReadOnlyAdmin } from '../src/admin.js'
import { store } from '../src/store.js'

const scope:HostScope={appId:'test',environmentId:'offline',clientId:'test'}
const kinds={widget:{schema_version:1,metadata_schema:{},representations:['component' as const],regions:['canvas'],required_capabilities:[]}}
const regions={canvas:{kinds:['widget'],representations:['component' as const],context_schema:{},ordering:'manifest' as const}}
const catalog=createSlotCatalog({kinds:[{kind:'widget',schemaVersion:1,role:'widget',representations:['component'],regions:['canvas'],validate:()=>true,project:()=>({label:'Fixture widget',region:'canvas'})}],regions:[{name:'canvas',representation:'component',kinds:['widget'],widgetKinds:['widget'],ordering:'manifest'}],reserved:()=>false})
async function response(revision:number,generation:string):Promise<PluginRegistryResponse>{const bytes=new TextEncoder().encode('export function Widget(){}');return {registry_version:2,host_instance:'test',revision,kinds,regions,plugins:{fixture:{owner_generation:generation,bundle_url:`/plugins/fixture/${generation}/bundle.js`,bundle_version:await bundleDigest(bytes)}},contributions:{widget:{'fixture/summary':{owner_id:'fixture',owner_generation:generation,kind:'widget',local_key:'summary',status:'accepted',schema_version:1,required:false,representation:'component',metadata:{},component:{export:'Widget',region:'canvas'}}}},refusals:[]}}
function presentation(mode:'sandboxed-frame'|'main-origin'){
 return createPresentationHost({kinds,regions,stylesheets:false,fetchBundle:async()=>new TextEncoder().encode('export function Widget(){}'),importModule:async bundle=>{expect(new TextDecoder().decode(bundle.bytes)).toBe('export function Widget(){}');return {Widget:()=>createElement('span',null,'actual component')}}},{scope,catalog,isolation:store<AppIsolationSnapshot>({appId:'test',effectiveMode:mode,revision:'explicit'}),renderContext:store<Readonly<Record<string,unknown>>>({}),panels:{reconcile(){},releaseScope(){}},diagnostics(){}})
}
describe('shared integration',()=>{
 it('adopts verified bytes and fences captured owner leases on unload/replacement',async()=>{
  const app=presentation('main-origin');await app.runtime.sync(JSON.stringify(await response(1,'g1')))
  const captured=app.runtime.getSnapshot().views[0];expect(captured.availability).toBe('available');expect(app.runtime.isCurrent(captured)).toBe(true)
  expect(renderToStaticMarkup(createElement(captured.value as ()=>ReturnType<typeof createElement>))).toContain('actual component')
  await app.registry.unload('fixture','g1');expect(app.runtime.isCurrent(captured)).toBe(false)
  await app.runtime.sync(JSON.stringify(await response(2,'g2')));expect(app.runtime.getSnapshot().views[0].ref.generation).toBe('g2');expect(app.runtime.isCurrent(captured)).toBe(false);await app.dispose()
 })
 it('sandboxed frame has no implicit main-origin fallback',async()=>{const app=presentation('sandboxed-frame');await app.runtime.sync(await response(1,'g1'));expect(app.runtime.getSnapshot().views[0].availability).toBe('isolated-controller-required');await app.dispose()})
 it('presentation actions refuse effects and only allow declared local navigation',async()=>{
  const navigation:string[]=[];const actions=readOnlyActions({scope:store<HostScope|undefined>(scope),invocation:store<Readonly<Record<string,unknown>>>({}),routes:['activity'],navigate:intent=>navigation.push(intent.route)})
  const context={scope,contribution:{hostInstance:'test',owner:'fixture',generation:'g1',kind:'widget',key:'summary'},invocation:{}}
  const signal=new AbortController().signal
  expect(await actions.command({type:'command',command:'ops/restart',arguments:{}},context,signal)).toEqual({status:'refused',reason:'denied'})
  expect(await actions.validate({type:'navigate',route:'unknown',parameters:{}},context,signal)).toEqual({status:'refused',reason:'unregistered-route'})
  expect(await actions.navigate({type:'navigate',route:'activity',parameters:{}},context,signal)).toEqual({status:'success'});expect(navigation).toEqual(['activity'])
 })
 it('renders actual controlled AdminContent and fences old context',()=>{
  const props={contextKey:'active',discovery:{phase:'ready' as const,contextKey:'active',manifest:{contract_version:1,app:{id:'demo',label:'Offline demo'},revision:'1',settings:[],health:[{id:'provider',label:'Fake provider',section:'status',stale_after_ms:1000}],stats:[],series:[],diagnostics:[]}},selection:{page:'dashboard' as const},destination:()=>({href:'#settings'}),nowMs:1791136800000}
  const html=renderToStaticMarkup(createElement(ReadOnlyAdmin,props));expect(html).toContain('Status');expect(html).toContain('Offline demo');expect(html).not.toContain('Save')
  const status=renderToStaticMarkup(createElement(ReadOnlyAdmin,{...props,selection:{page:'status'}}));expect(status).toContain('Unavailable');expect(status).not.toContain('Healthy')
  const fenced=renderToStaticMarkup(createElement(ReadOnlyAdmin,{...props,contextKey:'other'}));expect(fenced).not.toBe(html);expect(fenced).not.toContain('Offline demo')
 })
})

it('dispatches through the shared typed gateway and fences stale contribution authority',async()=>{
 const intent={type:'navigate' as const,route:'activity',parameters:{}}
 const declarations={slot:{schema_version:1,metadata_schema:{},representations:['declarative' as const],regions:['toolbar'],required_capabilities:[]}}
 const placements={toolbar:{kinds:['slot'],representations:['declarative' as const],context_schema:{},ordering:'manifest' as const}}
 const actionCatalog=createSlotCatalog({kinds:[{kind:'slot',schemaVersion:1,role:'contribution',representations:['declarative'],regions:['toolbar'],validate:()=>true,project:()=>({label:'Activity',region:'toolbar',action:intent})}],regions:[{name:'toolbar',representation:'declarative',kinds:['slot'],widgetKinds:[],ordering:'manifest',actions:{cardinality:'required',allowedTags:['navigate']}}],reserved:()=>false})
 const navigation:string[]=[]
 const actions=readOnlyActions({scope:store<HostScope|undefined>(scope),invocation:store<Readonly<Record<string,unknown>>>({caller:'reviewer'}),routes:['activity'],navigate:intent=>navigation.push(intent.route)})
 const app=createPresentationHost({kinds:declarations,regions:placements,stylesheets:false},{scope,catalog:actionCatalog,actions,isolation:store<AppIsolationSnapshot>({appId:'test',effectiveMode:'main-origin',revision:'test'}),renderContext:store<Readonly<Record<string,unknown>>>({}),panels:{reconcile(){},releaseScope(){}},diagnostics(){}})
 await app.runtime.sync({registry_version:2,host_instance:'test',revision:1,kinds:declarations,regions:placements,plugins:{fixture:{owner_generation:'g1'}},contributions:{slot:{'fixture/activity':{kind:'slot',owner_id:'fixture',owner_generation:'g1',local_key:'activity',status:'accepted',required:false,schema_version:1,representation:'declarative',metadata:{},declarative:{}}}},refusals:[]})
 const captured=app.runtime.getSnapshot().views[0]
 const {dispatchPluginAction}=await import('@hollis-labs/plugin-host-ui')
 expect(await dispatchPluginAction(intent,{host:app.runtime,contribution:captured.ref})).toEqual({status:'success'});expect(navigation).toEqual(['activity'])
 expect(await dispatchPluginAction({...intent,parameters:{forged:true}},{host:app.runtime,contribution:captured.ref})).toEqual({status:'refused',reason:'invalid-metadata'})
 await app.registry.unload('fixture','g1')
 expect(await dispatchPluginAction(intent,{host:app.runtime,contribution:captured.ref})).toEqual({status:'refused',reason:'stale-owner'});expect(navigation).toEqual(['activity']);await app.dispose()
})
