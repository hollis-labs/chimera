import type { PluginActionsAdapter, HostScope, Observable, PluginActionIntent } from '@hollis-labs/plugin-host-ui'
/** A presentation-only adapter: navigation is local UI state; command/modal
 * effects terminate with an explicit refusal. Production effects are app-owned. */
export function readOnlyActions(options:{scope:Observable<HostScope|undefined>;invocation:Observable<Readonly<Record<string,unknown>>>;routes:readonly string[];navigate:(intent:Extract<PluginActionIntent,{type:'navigate'}>)=>void}):PluginActionsAdapter {
 const routes=new Set(options.routes)
 return {scope:options.scope,invocation:options.invocation,
 async validate(intent,context,signal){
  if(signal.aborted)return {status:'refused',reason:'cancelled'}
  if(context.invocation!==undefined && intent.type==='navigate' && routes.has(intent.route) && Object.keys(intent.parameters).length===0)return {status:'success'}
  return {status:'refused',reason:intent.type==='navigate'?'unregistered-route':'denied'}
 },async navigate(intent,_context,signal){if(signal.aborted)return {status:'refused',reason:'cancelled'};if(!routes.has(intent.route)||Object.keys(intent.parameters).length>0)return {status:'refused',reason:'unregistered-route'};options.navigate(intent);return {status:'success'}},async command(){return {status:'refused',reason:'denied'}},async modal(){return {status:'refused',reason:'denied'}}}
}
