import { createSlotCatalog, type HostScope, type AppIsolationSnapshot, type RegistryEntry } from '@hollis-labs/plugin-host-ui'
import { version } from 'react'
import type {StylesheetSink,KindDescriptor,RegionDescriptor} from '@hollis-labs/plugin-registry'
import { createPresentationHost } from './runtime.js'
import { store } from './store.js'
import { readOnlyActions } from './actions.js'
const kinds:Record<string,KindDescriptor>={widget:{schema_version:1,metadata_schema:{},representations:['component'],regions:['operations.summary'],required_capabilities:[]},panel:{schema_version:1,metadata_schema:{},representations:['component'],regions:['operations.detail'],required_capabilities:[]}}
const regions:Record<string,RegionDescriptor>={'operations.summary':{kinds:['widget'],representations:['component'],context_schema:{},ordering:'manifest' as const},'operations.detail':{kinds:['panel'],representations:['component'],context_schema:{},ordering:'manifest' as const}}
/** Complete example recipe; region/kind strings are application policy examples,
 * not a shared manifest vocabulary. Explicit main-origin is limited to reviewed demo bytes. */
export function createOperationsExample(navigate:(route:string)=>void,stylesheets:StylesheetSink|false=false){
 const scope:HostScope={appId:'operations-demo',environmentId:'offline-demo',clientId:'browser'}
 const metadata=(entry:RegistryEntry):entry is RegistryEntry & {metadata:{label:string}}=>!!entry.metadata && typeof entry.metadata==='object' && Object.keys(entry.metadata).length===1 && 'label' in entry.metadata && typeof entry.metadata.label==='string' && entry.metadata.label.length>0 && entry.metadata.label.length<=120
 const catalog=createSlotCatalog({kinds:[
  {kind:'widget',schemaVersion:1,role:'widget',representations:['component'],regions:['operations.summary'],validate:metadata,project:entry=>({label:(entry.metadata as {label:string}).label,region:entry.component!.region,manifestOrder:0})},
  {kind:'panel',schemaVersion:1,role:'contribution',representations:['component'],regions:['operations.detail'],validate:metadata,project:entry=>({label:(entry.metadata as {label:string}).label,region:entry.component!.region,manifestOrder:1})}
 ],regions:[{name:'operations.summary',representation:'component',kinds:['widget'],widgetKinds:['widget'],ordering:'manifest'},{name:'operations.detail',representation:'component',kinds:['panel'],widgetKinds:[],ordering:'manifest'}],reserved:ref=>ref.owner==='host'})
 return createPresentationHost({kinds,regions,runtimes:{react:version},stylesheets},{scope,catalog,
 isolation:store<AppIsolationSnapshot>({appId:scope.appId,effectiveMode:'main-origin',revision:'reviewed-offline-demo'}),renderContext:store<Readonly<Record<string,unknown>>>({}),
 actions:readOnlyActions({scope:store<HostScope|undefined>(scope),invocation:store<Readonly<Record<string,unknown>>>({demo:true}),routes:['activity','usage'],navigate:intent=>navigate(intent.route)}),
 panels:{reconcile(){},releaseScope(){}},diagnostics:event=>console.warn('plugin diagnostic',event.stage,event.reason)})
}
