import {createAdminPresentationSession} from '../src/admin-session.js';
import {store} from '../src/store.js';
import type {createPlaybackFixture} from './playback-fixture.js';
export type MetricTab='activity'|'mission'|'usage';
export type MetricPhase='ready'|'empty'|'loading'|'error'|'denied'|'unknown'|'long';
export type AuthoredMetric=Readonly<{id:string;label:string;value:number|null|undefined;unit:string;status?:string;note:string}>;
export const metricTabs=Object.freeze(['activity','mission','usage'] as const);
/** Authored temporal examples, not plugin business records, provider receipts or a model capacity. */
export function metricProjection(index:number,tab:MetricTab):readonly AuthoredMetric[]{
 if(tab==='activity')return [{id:'starts',label:'Authored run starts',value:index,unit:'count',status:index?'running':'queued',note:'Finite authored starts through review cutoff; not a rate.'},{id:'failures',label:'Authored failures',value:index===3?1:0,unit:'count',status:index===3?'failed':'done',note:'Known zero differs from an uncollected error count.'},{id:'latency',label:'Uncollected latency',value:null,unit:'ms',note:'No measured latency supplied.'}];
 if(tab==='mission')return [{id:'tasks',label:'Supplied task records',value:3,unit:'count',status:'unknown',note:'Authored task count; not run status or permissions.'},{id:'active',label:'Supplied active tasks',value:index===1||index===2?1:0,unit:'count',status:index===1||index===2?'running':'queued',note:'Supplied task-status metadata only.'},{id:'done',label:'Supplied done tasks',value:index===3?2:0,unit:'count',status:index===3?'done':'queued',note:'Done refers to authored task records, not a provider result.'}];
 const result:AuthoredMetric[]=[{id:'tokens',label:'Authored token count',value:index>=2?123456789012345:null,unit:'tokens',status:index>=2?'done':undefined,note:'Authored example count; not observed model capacity or real receipts.'},{id:'cost',label:'Authored tiny amount',value:index>=2?0.00000019:0,unit:'USD',status:index>=2?'done':'queued',note:'Exact raw amount below preserves tiny positive versus rounded zero.'},{id:'reasoning',label:'Missing reasoning count',value:undefined,unit:'tokens',note:'Absent means Unknown, never zero.'}];
 if(index>=3)result.push({id:'invalid',label:'Invalid authored operand',value:NaN,unit:'count',status:'future-state',note:'Nonfinite operand withheld from numeric presentation; raw status is supplied unknown metadata.'});return result;
}
export function rawMetric(value:AuthoredMetric['value']){return value===null?'null (Unknown)':value===undefined?'undefined (Unknown)':!Number.isFinite(value)?`${String(value)} (invalid; Unknown)`:String(value)}
export function displayMetric(metric:AuthoredMetric){return typeof metric.value!=='number'||!Number.isFinite(metric.value)?'Unknown':metric.unit==='USD'?`$${metric.value.toFixed(4)}`:metric.value.toLocaleString('en-US')}
export function createOpsMetrics(app:ReturnType<typeof createPlaybackFixture>){
 let disposed=false,epoch=0,phase:MetricPhase='ready';const pending:(()=>void)[]=[];
 const scope=()=>{const frame=app.frame.getSnapshot(),view=app.select('operations.detail').find(v=>v.ref.owner==='fake-ops');const base=`${frame.contextKey}/${frame.sourceKey}/${view?.ref.hostInstance}/${view?.id}/${view?.ref.owner}/${view?.ref.generation}/${phase}`;return{base,identity:`${base}/${frame.epoch}/${frame.cutoff}`,available:!!view&&app.runtime.isCurrent(view),index:frame.index,cutoff:frame.cutoff}};
 let current=scope();const session=createAdminPresentationSession(app.frame.getSnapshot().contextKey,current.identity,['inspect']);
 const fresh=(tab:MetricTab='activity',selected:string|null=null)=>({...current,epoch,phase,tab,selected,busy:false,outcome:'No local metric inspection'});const state=store(fresh());
 const present=()=>current.available&&(phase==='ready'||phase==='long');
 const rows=()=>present()?metricProjection(current.index,state.getSnapshot().tab):[];
 function refresh(){if(disposed)return;const next=scope();if(next.identity===current.identity&&next.available===current.available)return;const old=state.getSnapshot(),keepTab=next.base===current.base&&next.available&&current.available;current=next;epoch++;session.reset(app.frame.getSnapshot().contextKey,`${current.identity}/${epoch}`);const tab=keepTab?old.tab:'activity',selected=keepTab&&metricProjection(next.index,tab).some(row=>row.id===old.selected)?old.selected:null;state.set(fresh(tab,selected))}
 function change(update:Partial<ReturnType<typeof fresh>>){epoch++;session.reset(app.frame.getSnapshot().contextKey,`${current.identity}/${epoch}`);state.set({...state.getSnapshot(),...update,epoch,busy:false,outcome:'No local metric inspection'})}
 const releaseLayout=app.layouts.get('operations.detail')?.subscribe(refresh)??(()=>{});
 function capture(){refresh();const identity=current.identity,lease=epoch;const valid=()=>{refresh();return !disposed&&current.available&&current.identity===identity&&epoch===lease};return{
  phase(value:MetricPhase){if(valid()&&['ready','empty','loading','error','denied','unknown','long'].includes(value)){phase=value;refresh()}},
  tab(value:unknown){if(valid()&&present()&&typeof value==='string'&&metricTabs.includes(value as MetricTab))change({tab:value as MetricTab,selected:null})},
  select(id:string){if(valid()&&present()&&rows().some(row=>row.id===id))change({selected:id})},
  clear(){if(valid()&&present())change({selected:null})},
  hold(){const target=state.getSnapshot().selected;if(!valid()||!present()||!target||state.getSnapshot().busy||!rows().some(row=>row.id===target))return;const tab=state.getSnapshot().tab,ticket=session.begin('inspect'),stamp=++epoch;state.set({...state.getSnapshot(),epoch,busy:true,outcome:'Held local metric inspection; no provider or mutation'});void new Promise<void>(resolve=>pending.push(resolve)).then(()=>{refresh();const live=state.getSnapshot(),row=rows().find(row=>row.id===target);if(disposed||!present()||current.identity!==identity||epoch!==stamp||live.tab!==tab||live.selected!==target||!row){ticket.cancel();return}ticket.commit(()=>state.set({...live,busy:false,outcome:`Inspected ${target}: raw ${rawMetric(row.value)} ${row.unit}; authored snapshot unchanged`}))})}
 }}
 return{state,refresh,capture,rows,present,current(identity:string,lease:number){refresh();return !disposed&&current.identity===identity&&epoch===lease},release(){pending.splice(0).forEach(resolve=>resolve())},dispose(){if(disposed)return;disposed=true;releaseLayout();epoch++;session.dispose();state.set({...fresh(),available:false,selected:null,busy:false})}};
}
