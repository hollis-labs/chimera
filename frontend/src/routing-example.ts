import {version} from 'react'
import type {KindDescriptor,RegionDescriptor,StylesheetSink} from '@hollis-labs/plugin-registry'
import type {AppIsolationSnapshot,HostScope,PluginActionIntent,RegistryEntry,SlotCatalogDefinitions} from '@hollis-labs/plugin-host-ui'
import {createPresentationComposition,memoryLayoutStorage} from './composition.js'
import {createFixtureActions} from './fixture-actions.js'
import {store} from './store.js'

/** Exact fixture choices are app-owned, not a new shared manifest vocabulary. */
export const exampleIntents:Readonly<Record<string,PluginActionIntent>>=Object.freeze({
 'navigate-detail':{type:'navigate',route:'detail',parameters:{}},
 'open-modal':{type:'modal',region:'operations.modal',entry:{owner_id:'fixture-tools',local_key:'modal'},props:{}},
 simulate:{type:'command',command:'fixture-tools/run',arguments:{}},
 delayed:{type:'command',command:'fixture-tools/run',arguments:{}},
})
const definitions=[
 {kind:'widget',representation:'component' as const,regions:['operations.summary','operations.modal'],role:'widget' as const},
 {kind:'panel',representation:'component' as const,regions:['operations.detail'],role:'contribution' as const},
 {kind:'page',representation:'component' as const,regions:['operations.page'],role:'contribution' as const},
 {kind:'slot',representation:'declarative' as const,regions:['operations.toolbar'],role:'contribution' as const},
 {kind:'nav.item',representation:'declarative' as const,regions:['operations.nav'],role:'contribution' as const},
 {kind:'command',representation:'handler' as const,regions:['operations.commands'],role:'contribution' as const},
]
export const exampleKinds:Record<string,KindDescriptor>=Object.fromEntries(definitions.map(definition=>[definition.kind,{schema_version:1,metadata_schema:{},representations:[definition.representation],regions:definition.regions,required_capabilities:[]}]))
export const exampleRegions:Record<string,RegionDescriptor>=Object.fromEntries(definitions.flatMap(definition=>definition.regions.map(region=>[region,{kinds:[definition.kind],representations:[definition.representation],context_schema:{},ordering:region==='operations.summary'?'priority-ascending':'manifest'}])))
function metadata(entry:RegistryEntry):boolean {
 if(!entry.metadata||typeof entry.metadata!=='object'||Array.isArray(entry.metadata))return false
 const value=entry.metadata as Record<string,unknown>
 return Object.keys(value).every(key=>['label','priority','manifest_order'].includes(key))&&typeof value.label==='string'&&value.label.length>0&&value.label.length<=120&&Number.isSafeInteger(value.manifest_order)&&Number.isInteger(value.priority)&&Number(value.priority)>=-2147483648&&Number(value.priority)<=2147483647
}
/** App-owned reviewed fixture catalogue, reused by isolated consumer proofs. */
export const exampleCatalog:SlotCatalogDefinitions={
 kinds:definitions.map(definition=>({kind:definition.kind,schemaVersion:1,role:definition.role,representations:[definition.representation],regions:definition.regions,
 validate:entry=>metadata(entry)&&(definition.representation!=='declarative'||Object.hasOwn(exampleIntents,entry.local_key))&&(definition.kind!=='command'||entry.handler?.id==='fixture-simulation'),
 project:entry=>{const value=entry.metadata as {label:string;priority:number;manifest_order:number};return {label:value.label,region:entry.component?.region??definition.regions[0],priority:value.priority,manifestOrder:value.manifest_order,action:exampleIntents[entry.local_key]}}
 })),
 regions:definitions.flatMap(definition=>definition.regions.map(region=>({name:region,representation:definition.representation,kinds:[definition.kind],widgetKinds:definition.role==='widget'?['widget']:[],ordering:region==='operations.summary'?'priority-ascending' as const:'manifest' as const,modal:region==='operations.modal',actions:definition.representation==='declarative'?{cardinality:'required' as const,allowedTags:definition.kind==='nav.item'?['navigate' as const]:['navigate' as const,'modal' as const,'command' as const]}:undefined}))),
 reserved:ref=>ref.owner==='host'||ref.key.startsWith('host-'),
}
/** Fresh per app/context. All route/modal/command effects stay in transient stores. */
export function createRoutingExample(contextKey:string,stylesheets:StylesheetSink|false=false){
 const scope:HostScope={appId:'operations-demo',environmentId:'offline-demo',projectId:contextKey,clientId:'browser'}
 const liveScope=store<HostScope|undefined>(scope),invocation=store<Readonly<Record<string,unknown>>>({fixture:true,contextKey})
 const navigation=store('overview'),renderContext=store<Readonly<Record<string,unknown>>>({contextLabel:contextKey})
 const isolation=store<AppIsolationSnapshot>({appId:scope.appId,effectiveMode:'main-origin',revision:'explicit-reviewed-offline-fixture'})
 const diagnostics=store<readonly string[]>([]),pending:((()=>void))[]=[]
 const actions=createFixtureActions({scope:liveScope,invocation,routes:['overview','detail'],modalRegions:['operations.modal'],commands:{'fixture-tools/run':{validate:intent=>Object.keys(intent.arguments).length===0,outcome:'success'}},authorize:context=>context.invocation.fixture===true,navigate:intent=>navigation.set(intent.route),wait:(_intent,_signal)=>new Promise(resolve=>pending.push(resolve))})
 const app=createPresentationComposition({scope,registryOptions:{kinds:exampleKinds,regions:exampleRegions,runtimes:{react:version},stylesheets,onDiagnostic:event=>{const reason=event.type==='plugin-failed'?event.error.reason:event.type==='response-refused'?event.reason:event.type==='contribution-refused'?event.refusal.reason:event.diagnostic.reason;diagnostics.set([...diagnostics.getSnapshot(),reason])}},catalog:exampleCatalog,routes:[{id:'overview',label:'Overview',path:'/',region:'operations.summary'},{id:'detail',label:'Details',path:'/detail',region:'operations.page'}],storage:memoryLayoutStorage(),actions:actions.adapter,isolation,renderContext,diagnostics:event=>diagnostics.set([...diagnostics.getSnapshot(),event.reason])})
 actions.observe(app.runtime)
 return {...app,actions,navigation,diagnostics,isolation,contextKey,
 completeProducer(){for(const complete of pending.splice(0))complete()},
 invalidateContext(){liveScope.set(undefined);invocation.set({fixture:true,contextKey:'revoked'});navigation.set('overview')},
 async dispose(){actions.dispose();await app.dispose()}}
}
