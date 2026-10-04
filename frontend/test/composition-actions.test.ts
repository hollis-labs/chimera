import {createElement} from 'react'
import {describe,it,expect,vi} from 'vitest'
import {bundleDigest,type KindDescriptor,type RegionDescriptor,type PluginRegistryResponse,type RegistryContribution} from '@hollis-labs/plugin-registry'
import {dispatchPluginAction,type AppIsolationSnapshot,type ContributionRef,type HostScope,type PluginActionIntent,type SlotCatalogDefinitions} from '@hollis-labs/plugin-host-ui'
import {createPresentationComposition,memoryLayoutStorage} from '../src/composition.js'
import {createFixtureActions} from '../src/fixture-actions.js'
import {store} from '../src/store.js'
const scope:HostScope={appId:'composition',environmentId:'fixture',clientId:'test'}
const intents:Record<string,PluginActionIntent>={navigate:{type:'navigate',route:'detail',parameters:{}},modal:{type:'modal',region:'modal',entry:{owner_id:'tools',local_key:'modal'},props:{}},simulate:{type:'command',command:'tools/run',arguments:{}}}
const kinds:Record<string,KindDescriptor>={widget:{schema_version:1,metadata_schema:{},representations:['component'],regions:['canvas','modal'],required_capabilities:[]},slot:{schema_version:1,metadata_schema:{},representations:['declarative'],regions:['toolbar'],required_capabilities:[]},command:{schema_version:1,metadata_schema:{},representations:['handler'],regions:['commands'],required_capabilities:[]}}
const regions:Record<string,RegionDescriptor>={canvas:{kinds:['widget'],representations:['component'],context_schema:{},ordering:'priority-ascending'},modal:{kinds:['widget'],representations:['component'],context_schema:{},ordering:'manifest'},toolbar:{kinds:['slot'],representations:['declarative'],context_schema:{},ordering:'manifest'},commands:{kinds:['command'],representations:['handler'],context_schema:{},ordering:'manifest'}}
const catalog:SlotCatalogDefinitions={kinds:[{kind:'widget',schemaVersion:1,role:'widget',representations:['component'],regions:['canvas','modal'],validate:entry=>!!entry.metadata&&typeof entry.metadata==='object'&&'label' in entry.metadata&&typeof entry.metadata.label==='string',project:entry=>({label:(entry.metadata as {label:string}).label,region:entry.component!.region,priority:(entry.metadata as {priority?:number}).priority??10,manifestOrder:(entry.metadata as {order?:number}).order??0})},{kind:'slot',schemaVersion:1,role:'contribution',representations:['declarative'],regions:['toolbar'],validate:entry=>Object.hasOwn(intents,entry.local_key),project:entry=>({label:entry.local_key,region:'toolbar',action:intents[entry.local_key]})},{kind:'command',schemaVersion:1,role:'contribution',representations:['handler'],regions:['commands'],validate:entry=>entry.local_key==='run',project:()=>({label:'Fixture simulation',region:'commands'})}],regions:[{name:'canvas',representation:'component',kinds:['widget'],widgetKinds:['widget'],ordering:'priority-ascending'},{name:'modal',representation:'component',kinds:['widget'],widgetKinds:['widget'],ordering:'manifest',modal:true},{name:'toolbar',representation:'declarative',kinds:['slot'],widgetKinds:[],ordering:'manifest',actions:{cardinality:'required',allowedTags:['navigate','modal','command']}},{name:'commands',representation:'handler',kinds:['command'],widgetKinds:[],ordering:'manifest'}],reserved:ref=>ref.key==='reserved'}
const bytes=new TextEncoder().encode('reviewed fixture')
function entry(owner:string,key:string,kind:string,region:string):RegistryContribution {
 const base={owner_id:owner,owner_generation:'g1',local_key:key,kind,status:'accepted' as const,schema_version:1,required:false,metadata:{label:key}}
 return kind==='widget'?{...base,representation:'component',component:{export:'Widget',region}}:kind==='command'?{...base,representation:'handler',handler:{id:'fixture-run'}}:{...base,representation:'declarative',declarative:{}}
}
async function response(extra:RegistryContribution[]=[]):Promise<PluginRegistryResponse>{
 const contributions:PluginRegistryResponse['contributions']={}
 for(const item of [entry('ops','first','widget','canvas'),entry('stable','second','widget','canvas'),entry('tools','modal','widget','modal'),entry('tools','run','command','commands'),...Object.keys(intents).map(key=>entry('ops',key,'slot','toolbar')),...extra]){(contributions[item.kind]??={})[`${item.owner_id}/${item.local_key}`]=item}
 return {registry_version:2,host_instance:'fixture',revision:1,kinds,regions,plugins:Object.fromEntries(['ops','stable','tools'].map(owner=>[owner,{owner_generation:'g1',bundle_url:`/plugins/${owner}/g1/bundle.js`,bundle_version:''}])),contributions,refusals:[]}
}
async function fixture(options:Partial<Parameters<typeof createFixtureActions>[0]>={}){
 const liveScope=store<HostScope|undefined>(scope),invocation=store<Readonly<Record<string,unknown>>>({fixture:true}),navigation=store('overview')
 const actions=createFixtureActions({scope:liveScope,invocation,routes:['overview','detail'],modalRegions:['modal'],commands:{'tools/run':{validate:intent=>Object.keys(intent.arguments).length===0,outcome:'success'}},authorize:context=>context.invocation.fixture===true,navigate:intent=>navigation.set(intent.route),...options})
 const isolation=store<AppIsolationSnapshot>({appId:scope.appId,effectiveMode:'main-origin',revision:'reviewed'})
 const app=createPresentationComposition({scope,registryOptions:{kinds,regions,stylesheets:false,fetchBundle:async()=>bytes,importModule:async()=>({Widget:()=>createElement('p',null,'fixture')})},catalog,routes:[{id:'overview',label:'Overview',path:'/',region:'canvas'},{id:'detail',label:'Detail',path:'/detail',region:'modal'}],storage:memoryLayoutStorage(),actions:actions.adapter,isolation,renderContext:store<Readonly<Record<string,unknown>>>({})})
 actions.observe(app.runtime)
 const input=await response();for(const plugin of Object.values(input.plugins))plugin.bundle_version=await bundleDigest(bytes)
 await app.runtime.sync(input)
 return {app,actions,isolation,liveScope,invocation,navigation,input,source:(key:string)=>app.runtime.getSnapshot().views.find(view=>view.ref.owner==='ops'&&view.ref.key===key)!,async dispose(){actions.dispose();await app.dispose()}}
}
describe('controlled composition',()=>{
 it('keeps route policy local and scopes shared layout order, visibility and selection',async()=>{
  const f=await fixture();const available=f.app.select('canvas');expect(available.map(view=>view.ref.key)).toEqual(['first','second'])
  const layout=f.app.layouts.get('canvas')!;layout.save({order:[available[1].id,available[0].id],visibility:{[available[0].id]:false},selected:available[0].id});layout.reconcile(available.map(view=>view.id))
  expect(f.app.select('canvas').map(view=>view.ref.key)).toEqual(['second']);expect(layout.getSnapshot().selected).toBe(available[1].id)
  await f.app.registry.unload('ops');expect(f.app.select('toolbar')).toEqual([]);expect(f.app.select('canvas').map(view=>view.ref.owner)).toEqual(['stable']);await f.dispose()
 })
 it('direct selectors fence stale component views on isolation changes',async()=>{const f=await fixture();const previous=f.app.select('canvas');expect(previous).toHaveLength(2);f.isolation.set({appId:scope.appId,effectiveMode:'sandboxed-frame',revision:'isolate'});expect(f.app.select('canvas')).toEqual([]);expect(previous.every(view=>!f.app.runtime.isCurrent(view))).toBe(true);f.isolation.set({appId:scope.appId,effectiveMode:'main-origin',revision:'reviewed-again'});expect(f.app.select('canvas')).toHaveLength(2);await f.dispose()})
 it.each(['//external','/a/../b','/a\\b','/a b','/a?b','/a%2fb'])('refuses ambiguous host path %s',async path=>{
  expect(()=>createPresentationComposition({scope,registryOptions:{kinds,regions,stylesheets:false},catalog,routes:[{id:'bad',label:'Bad',path,region:'canvas'}],storage:memoryLayoutStorage(),isolation:store<AppIsolationSnapshot>({appId:scope.appId,effectiveMode:'main-origin',revision:'fixture'}),renderContext:store({})})).toThrow('Invalid host route policy')
 })
 it('uses upstream optional/required refusal planning and reserved identity policy',async()=>{
  const f=await fixture();const optional=entry('ops','optional','future','canvas');const reserved=entry('ops','reserved','widget','canvas')
  const input=await response([optional,reserved]);input.revision=2;input.plugins=f.input.plugins
  const result=await f.app.runtime.sync(input);expect(result.registryResult).toMatchObject({accepted:true});expect(result.planning.refusals.map(refusal=>refusal.reason)).toContain('reserved');expect(f.app.registry.refusals().map(refusal=>refusal.reason)).toContain('unsupported-kind');expect(f.app.select('canvas').some(view=>view.ref.key==='reserved')).toBe(false)
  const before=f.app.runtime.getSnapshot();optional.required=true;input.revision=3;const required=await f.app.runtime.sync(input);expect(required.registryResult).toMatchObject({accepted:false});expect(f.app.runtime.getSnapshot()).toBe(before);await f.dispose()
 })
})
describe('shared typed gateway + fixture producers',()=>{
 it('navigates, presents a pinned modal and closes it when the target owner is revoked',async()=>{
  const f=await fixture();expect(await dispatchPluginAction(intents.navigate,{host:f.app.runtime,contribution:f.source('navigate').ref})).toEqual({status:'success'});expect(f.navigation.getSnapshot()).toBe('detail')
  const source=f.source('modal').ref;expect(await dispatchPluginAction(intents.modal,{host:f.app.runtime,contribution:source})).toEqual({status:'success'});expect(f.actions.modal.getSnapshot()?.target.owner).toBe('tools')
  await f.app.registry.unload('tools');expect(f.actions.modal.getSnapshot()).toBeUndefined();expect(await dispatchPluginAction(intents.modal,{host:f.app.runtime,contribution:source})).toEqual({status:'refused',reason:'unresolved-modal-target'});await f.dispose()
 })
 it.each(['source','target','scope','invocation','caller'] as const)('fences delayed simulation producers after %s cancellation',async change=>{
  let complete!:()=>void;const f=await fixture({wait:()=>new Promise(resolve=>{complete=resolve})});const controller=new AbortController()
  const pending=dispatchPluginAction(intents.simulate,{host:f.app.runtime,contribution:f.source('simulate').ref},controller.signal)
  await vi.waitFor(()=>expect(f.actions.receipts.getSnapshot()[0]?.status).toBe('pending'))
  if(change==='source')await f.app.registry.unload('ops');if(change==='target')await f.app.registry.unload('tools');if(change==='scope')f.liveScope.set({...scope,environmentId:'changed'});if(change==='invocation')f.invocation.set({fixture:true,context:'changed'});if(change==='caller')controller.abort()
  expect((await pending).status).toBe('refused');complete();await Promise.resolve();await Promise.resolve()
  expect(f.actions.receipts.getSnapshot().some(receipt=>receipt.status==='simulated')).toBe(false);expect(f.navigation.getSnapshot()).toBe('overview');expect(f.actions.modal.getSnapshot()).toBeUndefined();await f.dispose()
 })
 it('late validation cannot execute a producer or navigate after source revocation',async()=>{
  let complete!:()=>void;let entered=false;const f=await fixture({validateWait:()=>new Promise(resolve=>{entered=true;complete=resolve})})
  const pending=dispatchPluginAction(intents.navigate,{host:f.app.runtime,contribution:f.source('navigate').ref});await vi.waitFor(()=>expect(entered).toBe(true));await f.app.registry.unload('ops');expect(await pending).toEqual({status:'refused',reason:'stale-owner'});complete();await Promise.resolve();await Promise.resolve();expect(f.navigation.getSnapshot()).toBe('overview');await f.dispose()
 })
 it('stale observer cleanup cannot unsubscribe a replacement modal authority observer',async()=>{
  const f=await fixture();const old=f.actions.observe(f.app.runtime);f.actions.observe(f.app.runtime);old()
  await dispatchPluginAction(intents.modal,{host:f.app.runtime,contribution:f.source('modal').ref});await f.app.registry.unload('tools');expect(f.actions.modal.getSnapshot()).toBeUndefined();await f.dispose()
 })
 it.each(['refused','error'] as const)('records fixture %s outcome without business execution',async outcome=>{const f=await fixture({commands:{'tools/run':{validate:()=>true,outcome}}});const result=await dispatchPluginAction(intents.simulate,{host:f.app.runtime,contribution:f.source('simulate').ref});expect(result.status).toBe('refused');expect(f.actions.receipts.getSnapshot()[0]).toMatchObject({status:'simulated',outcome});await f.dispose()})
 it('records only labelled simulations and refuses undeclared actions/arguments',async()=>{
  const f=await fixture();const ref=f.source('simulate').ref
  expect(await dispatchPluginAction(intents.simulate,{host:f.app.runtime,contribution:ref})).toEqual({status:'success'});expect(f.actions.receipts.getSnapshot()[0]).toMatchObject({status:'simulated',outcome:'success',command:'tools/run'})
  expect(await dispatchPluginAction({...intents.simulate,arguments:{forged:true}},{host:f.app.runtime,contribution:ref})).toEqual({status:'refused',reason:'invalid-metadata'})
  expect(await dispatchPluginAction({type:'handler',id:'arbitrary'},{host:f.app.runtime,contribution:ref})).toEqual({status:'refused',reason:'unsupported-action'});await f.dispose()
 })
})
