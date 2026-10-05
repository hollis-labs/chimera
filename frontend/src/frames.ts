import {createPluginFrameBrowser,type PluginFrameBrowserOptions,type FrameDocumentDelivery} from '@hollis-labs/plugin-host-ui/isolation'
import {createPresentationComposition,type CompositionOptions} from './composition.js'

/** Host assurance is explicit: endpoint must serve the exact admitted document,
 * CSP and Permissions-Policy with no redirect. This does not inspect browser CSP. */
export function httpFrameDelivery(options:{endpoint:string;policyAdmitted:true;diagnostics(reason:string):void}):FrameDocumentDelivery{
 const endpoint=new URL(options.endpoint,location.href)
 if(options.policyAdmitted!==true||endpoint.origin!==location.origin||endpoint.username!==''||endpoint.password!==''||endpoint.search!==''||endpoint.hash!==''||!endpoint.pathname.endsWith('/'))throw new Error('policy-unavailable')
 return {async provision(document){
  if(!/^[a-f0-9]{64}$/.test(document.frameId))throw new Error('policy-unavailable')
  let response:Response
  try{response=await fetch(endpoint,{method:'POST',credentials:'same-origin',redirect:'error',signal:AbortSignal.timeout(10000),headers:{'Content-Type':'application/json'},body:JSON.stringify(document)})}catch{options.diagnostics('policy-unavailable');throw new Error('policy-unavailable')}
  if(response.status!==201){options.diagnostics('policy-unavailable');throw new Error('policy-unavailable')}
  const src=new URL(document.frameId,endpoint).href;let released=false
  return {src,policyAdmitted:true as const,release(){if(released)return;released=true;void fetch(src,{method:'DELETE',credentials:'same-origin',redirect:'error',signal:AbortSignal.timeout(5000),keepalive:true}).then(response=>{if(!response.ok&&response.status!==404)options.diagnostics('document-release-failed')}).catch(()=>options.diagnostics('document-release-failed'))}}
 }}
}
export interface IsolatedCompositionOptions extends Omit<CompositionOptions,'frameController'> {
 frame:Omit<PluginFrameBrowserOptions,'appId'|'isolation'|'isActive'|'isOwnerActive'|'subscribeLeases'|'host'>
}
/** One shared importer/controller and registry per app host. The review callback,
 * runtime inventory, props projection, component bindings and mode are app policy. */
export function createIsolatedComposition(options:IsolatedCompositionOptions){
 let app:ReturnType<typeof createPresentationComposition>|undefined
 const leaseListeners=new Set<()=>void>()
 const frames=createPluginFrameBrowser({...options.frame,appId:options.scope.appId,isolation:options.isolation,
  isActive:ref=>{const entry=app?.registry.get(ref.kind,`${ref.owner}/${ref.key}`);return entry?.owner_generation===ref.generation&&entry.hostInstance===ref.hostInstance&&entry.isActive()===true},
  isOwnerActive:owner=>app?.registry.isActive(owner.owner,owner.generation,owner.hostInstance)===true,
  subscribeLeases:listener=>{leaseListeners.add(listener);return()=>{leaseListeners.delete(listener)}},
  host:()=>{if(!app)throw new Error('absent-host');return app.runtime},
 })
 try{app=createPresentationComposition({...options,frameController:frames,registryOptions:{...options.registryOptions,importModule:frames.importModule}})}catch(error){frames.dispose();leaseListeners.clear();throw error}
 const releaseLeases=app.registry.subscribe(()=>{for(const listener of [...leaseListeners])listener()})
 return {...app,frames,async dispose(){releaseLeases();frames.dispose();leaseListeners.clear();await app!.dispose()}}
}
