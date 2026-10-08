import type {ObservationState, HealthSummaryProps, StatCollectionProps} from '@hollis-labs/kit-observe';
import type {SampleSeriesViewProps} from '@hollis-labs/kit-observe/charts';
import {createAdminPresentationSession} from '../src/admin-session.js';
import {store} from '../src/store.js';
import type {createPlaybackFixture} from './playback-fixture.js';
export const observationAppearances = ['retained-error','ready','refreshing','idle','initial-loading','initial-error','unsupported','paused','stale-boundary','stale','skew','invalid-clock','invalid-receipt','invalid-threshold','empty','truncated'] as const;
export type ObservationAppearance = typeof observationAppearances[number];
export const observationReceipt = Date.parse('2026-10-08T02:00:00Z');
export function createObservationReviewFixture(app: ReturnType<typeof createPlaybackFixture>) {
 let disposed=false,lease=0,resource='resource-a',receipt=observationReceipt,now=receipt+5000,appearance:ObservationAppearance='retained-error';
 const pending:(()=>void)[]=[];
 const readScope=()=>{const frame=app.frame.getSnapshot(),view=app.select('operations.detail').find(v=>v.ref.owner==='fake-ops');return{identity:`${frame.contextKey}/${frame.sourceKey}/${frame.epoch}/${view?.ref.hostInstance}/${view?.id}/${view?.ref.generation}/${resource}/${receipt}/${appearance}/${now}`,available:!!view&&app.runtime.isCurrent(view)}};
 let scope=readScope();
 const session=createAdminPresentationSession(app.frame.getSnapshot().contextKey,scope.identity,['retry']);
 const empty=()=>({...scope,controlEpoch:lease,resource,receipt,now,appearance,busy:false,open:false,intent:null as null|{kind:'local-retry-inspection';resource:string;receipt:string|null;appearance:ObservationAppearance;clock:number},output:'No local retry inspection'});
 const state=store(empty());
 function refresh(){if(disposed)return;const next=readScope();if(next.identity===scope.identity&&next.available===scope.available)return;scope=next;lease++;session.reset(app.frame.getSnapshot().contextKey,`${scope.identity}/${scope.available}/${lease}`);state.set(empty())}
 function retireLocal(){lease++;session.reset(app.frame.getSnapshot().contextKey,`${scope.identity}/${lease}`);state.set(empty())}
 function current(identity:string){refresh();return !disposed&&scope.identity===identity}
 const eligible=()=>scope.available&&['retained-error','initial-error','idle'].includes(appearance);
 function capture(){refresh();const identity=scope.identity,stamp=lease,valid=()=>{refresh();return !disposed&&scope.available&&identity===scope.identity&&stamp===lease};return{
  retry(){if(!valid()||!eligible()||state.getSnapshot().busy)return;const intent={kind:'local-retry-inspection' as const,resource,receipt:['idle','initial-loading','initial-error'].includes(appearance)?null:new Date(receipt).toISOString(),appearance,clock:now};const ticket=session.begin('retry'),held=++lease;state.set({...state.getSnapshot(),controlEpoch:lease,busy:true,intent,output:'Held local retry candidate; no fetch or receipt change'});void new Promise<void>(resolve=>pending.push(resolve)).then(()=>{refresh();if(disposed||scope.identity!==identity||lease!==held||!eligible()){ticket.cancel();return;}ticket.commit(()=>state.set({...state.getSnapshot(),busy:false,output:'Inspected retry candidate only; successful receipt unchanged'}));});},
  appearance(value:ObservationAppearance){if(valid()&&observationAppearances.includes(value)){appearance=value;now=value==='stale-boundary'?receipt+5000:value==='stale'?receipt+5001:value==='skew'?receipt-1:value==='invalid-clock'?NaN:receipt+5000;refresh()}},
  clock(){if(valid()){now=Number.isFinite(now)?now+1000:receipt+5000;refresh()}},
  resource(){if(valid()){resource=resource==='resource-a'?'resource-b':'resource-a';refresh()}},
  receipt(){if(valid()){receipt=receipt===observationReceipt?observationReceipt-10000:observationReceipt;refresh()}},
  open(open:boolean){if(!valid()||!state.getSnapshot().intent)return;if(open)state.set({...state.getSnapshot(),open:true});else retireLocal()}
 }}
 function props(){const phase:ObservationState['phase']=appearance==='refreshing'||appearance==='initial-loading'?'loading':appearance==='retained-error'||appearance==='initial-error'?'error':appearance==='idle'?'idle':'ready';const initial=['idle','initial-loading','initial-error'].includes(appearance);const observation:ObservationState={phase,observedAt:initial?undefined:appearance==='invalid-receipt'?'not-a-date':new Date(receipt).toISOString(),nowMs:now,staleAfterMs:appearance==='invalid-threshold'?0:5000,supported:appearance!=='unsupported',paused:appearance==='paused',error:phase==='error'?'Authored offline resource failure':undefined,onRetry:eligible()&&!state.getSnapshot().busy?capture().retry:undefined};
 const health:HealthSummaryProps={label:'Returned health evidence',status:appearance==='empty'?'unknown':'degraded',checks:appearance==='empty'?[]:['healthy','degraded','unhealthy','unknown'].map(status=>({id:status,label:`Authored ${status} check`,status:status as 'healthy'|'degraded'|'unhealthy'|'unknown'})),observation};
 const stats:StatCollectionProps={label:'Explicit sample values',rows:appearance==='empty'?[]:[['Known zero',0,'count','counter'],['Uncollected',null,'bytes','gauge'],['Nonfinite sample',NaN,'seconds','gauge'],['Latency',12,'milliseconds','gauge'],['Ratio',0.25,'ratio','gauge'],['Percent',25,'percent','gauge']].map(([label,value,unit,kind])=>({id:String(label),label:String(label),value:value as number|null,unit:unit as 'count',kind:kind as 'counter',observation:{...observation,onRetry:undefined}}))};
 const series:SampleSeriesViewProps={label:'Exact authored UTC samples',points:appearance==='empty'?[]:[{at:new Date(receipt-4000).toISOString(),value:0},{at:new Date(receipt-3500).toISOString(),value:4},{at:new Date(receipt-2000).toISOString(),value:null},{at:new Date(receipt-1000).toISOString(),value:2},{at:new Date(receipt).toISOString(),value:1}],unit:'count',kind:'counter',requested:{from:new Date(receipt-4000).toISOString(),to:new Date(receipt).toISOString(),limit:5},bounds:{maxPoints:5,maxWindowSeconds:4},truncated:appearance==='truncated',observation:{...observation,onRetry:undefined}};return{observation,health,stats,series}}
 return{state,refresh,current,capture,props,release(){pending.splice(0).forEach(resolve=>resolve())},dispose(){if(disposed)return;disposed=true;lease++;session.dispose();state.set({...empty(),available:false})}};
}
