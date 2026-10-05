import type {ActionContext,ActionResult,ContributionRef,HostScope,Observable,PluginActionIntent,PluginActionsAdapter,PluginHostReader} from '@hollis-labs/plugin-host-ui'
import {store} from './store.js'

type CommandIntent=Extract<PluginActionIntent,{type:'command'}>
type NavigateIntent=Extract<PluginActionIntent,{type:'navigate'}>
type ModalIntent=Extract<PluginActionIntent,{type:'modal'}>
export interface FixtureModal {source:ContributionRef;target:ContributionRef;intent:ModalIntent}
export interface SimulationReceipt {id:number;command:string;source:ContributionRef;status:'pending'|'simulated'|'cancelled';outcome?:'success'|'refused'|'error'}
export interface FixtureActionsOptions {
 bindings?:PluginActionsAdapter['bindings']
 scope:Observable<HostScope|undefined>
 invocation:Observable<Readonly<Record<string,unknown>>>
 routes:readonly string[]
 modalRegions:readonly string[]
 commands:Readonly<Record<string,{validate(intent:CommandIntent):boolean;outcome:'success'|'refused'|'error'}>>
 authorize(context:ActionContext,intent:PluginActionIntent):boolean
 navigate(intent:NavigateIntent):void
 validateModal?(intent:ModalIntent):boolean
 /** Optional deterministic fixture playback gates. Never a business executor. */
 wait?(intent:CommandIntent,signal:AbortSignal):Promise<void>
 validateWait?(intent:PluginActionIntent,signal:AbortSignal):Promise<void>
}
const refused=(reason:'cancelled'|'denied'|'invalid-arguments'|'unregistered-route'|'unresolved-modal-target'|'host-failed'):ActionResult=>({status:'refused',reason})
/** Instance-owned transient presentation state. The shared gateway is the sole
 * source/target admission path. Business commands only create simulation receipts. */
export function createFixtureActions(options:FixtureActionsOptions){
 const routes=new Set(options.routes),modalRegions=new Set(options.modalRegions),commands={...options.commands}
 const modal=store<FixtureModal|undefined>(undefined),receipts=store<readonly SimulationReceipt[]>([])
 let epoch=0,nextId=0,disposed=false,releaseAuthority:()=>void=()=>{}
 const reset=()=>{epoch++;modal.set(undefined);receipts.set([])}
 const releases=[options.scope.subscribe(reset),options.invocation.subscribe(reset)]
 const live=(signal:AbortSignal,stamp:number)=>!disposed&&!signal.aborted&&stamp===epoch
 const update=(id:number,patch:Partial<SimulationReceipt>)=>receipts.set(receipts.getSnapshot().map(receipt=>receipt.id===id?Object.freeze({...receipt,...patch}):receipt))
 const adapter:PluginActionsAdapter={bindings:options.bindings,scope:options.scope,invocation:options.invocation,
 async validate(intent,context,signal){
  const stamp=epoch;await options.validateWait?.(intent,signal)
  if(!live(signal,stamp))return refused('cancelled')
  if(!options.authorize(context,intent))return refused('denied')
  if(intent.type==='navigate')return routes.has(intent.route)&&Object.keys(intent.parameters).length===0?{status:'success'}:refused('unregistered-route')
  if(intent.type==='modal')return modalRegions.has(intent.region)&&context.target&& (options.validateModal?.(intent)??Object.keys(intent.props).length===0)?{status:'success'}:refused('unresolved-modal-target')
  const command=commands[intent.command];return command&&command.validate(intent)?{status:'success'}:refused('invalid-arguments')
 },
 async navigate(intent,_context,signal){if(disposed||signal.aborted)return refused('cancelled');if(!routes.has(intent.route)||Object.keys(intent.parameters).length)return refused('unregistered-route');options.navigate(intent);return {status:'success'}},
 async modal(intent,context,signal){if(disposed||signal.aborted)return refused('cancelled');if(!context.target||!modalRegions.has(intent.region))return refused('unresolved-modal-target');modal.set(Object.freeze({source:context.contribution,target:context.target,intent}));return {status:'success'}},
 async command(intent,context,signal){
  const stamp=epoch,command=commands[intent.command];if(!live(signal,stamp))return refused('cancelled');if(!command||!command.validate(intent))return refused('invalid-arguments')
  const id=++nextId;receipts.set([...receipts.getSnapshot(),Object.freeze({id,command:intent.command,source:context.contribution,status:'pending' as const})])
  const cancel=()=>{if(!disposed&&stamp===epoch)update(id,{status:'cancelled'})};signal.addEventListener('abort',cancel,{once:true})
  try{await options.wait?.(intent,signal);if(!live(signal,stamp)){cancel();return refused('cancelled')};update(id,{status:'simulated',outcome:command.outcome});return command.outcome==='refused'?refused('denied'):command.outcome==='error'?refused('host-failed'):{status:'success'}}
  catch{if(live(signal,stamp))update(id,{status:'simulated',outcome:'error'});return refused(signal.aborted?'cancelled':'host-failed')}
  finally{signal.removeEventListener('abort',cancel)}
 }}
 return {adapter,modal,receipts,reset,closeModal(){modal.set(undefined)},observe(host:PluginHostReader){
  releaseAuthority()
  const current=(ref:ContributionRef)=>host.getSnapshot().views.some(view=>view.ref.hostInstance===ref.hostInstance&&view.ref.owner===ref.owner&&view.ref.generation===ref.generation&&view.ref.kind===ref.kind&&view.ref.key===ref.key&&host.isCurrent(view))
  const changed=()=>{const open=modal.getSnapshot();if(open&&(!current(open.source)||!current(open.target)))modal.set(undefined)}
  const releaseRetain=host.retain(),unsubscribe=host.subscribe(changed)
  const release=()=>{unsubscribe();releaseRetain()};releaseAuthority=release;changed();return ()=>{release();if(releaseAuthority===release)releaseAuthority=()=>{}}
 },dispose(){if(disposed)return;disposed=true;reset();releaseAuthority();for(const release of releases)release()}}
}
