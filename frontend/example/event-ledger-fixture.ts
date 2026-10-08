import {createAdminPresentationSession} from '../src/admin-session.js';
import {store} from '../src/store.js';
import {playbackBoundaries,type createPlaybackFixture} from './playback-fixture.js';
export type LedgerPhase='ready'|'empty'|'loading'|'error'|'denied'|'unknown'|'long';
export type LedgerSort='ascending'|'descending';
export type AuthoredLedgerRow=Readonly<{id:string;at:number;kind:'event'|'log';rawType:string;reference:string|undefined;value:number|null|undefined|string;message:string}>;
/** Finite authored samples, NOT fake-ops business events, provider logs or execution receipts. */
export const authoredLedger:readonly AuthoredLedgerRow[]=Object.freeze(playbackBoundaries.flatMap((at,boundary)=>Array.from({length:6},(_,offset)=>Object.freeze({id:`authored-${boundary}-${offset}`,at,kind:offset%2?'log' as const:'event' as const,rawType:['fixture.review.note','info','fixture.review.zero','future-level','fixture.review.literal','debug'][offset],reference:offset===5?undefined:`authored-reference-${boundary}`,value:[0,null,undefined,'future-tag',1,0][offset],message:offset===4?`${'Long authored escaped note. '.repeat(16)}<script>globalThis.ledgerExecuted=true</script>`:`Authored ${offset%2?'log':'event'} sample ${boundary}/${offset}; no execution or production provenance.`}))));
export function rawLedgerValue(value:AuthoredLedgerRow['value']){return value===null?'null (Unknown)':value===undefined?'undefined (absent; Unknown)':typeof value==='string'?`${value} (unknown raw tag)`:String(value)}
export function ledgerPrefix(cutoff:number){return authoredLedger.filter(row=>row.at<=cutoff)}
export function createEventLedger(app:ReturnType<typeof createPlaybackFixture>){
 let disposed=false,epoch=0,phase:LedgerPhase='ready';const pending:(()=>void)[]=[];
 const readScope=()=>{const frame=app.frame.getSnapshot(),view=app.select('operations.detail').find(v=>v.ref.owner==='fake-ops');return{identity:`${frame.contextKey}/${frame.sourceKey}/${frame.epoch}/${frame.cutoff}/${view?.ref.hostInstance}/${view?.id}/${view?.ref.owner}/${view?.ref.generation}/${phase}`,available:!!view&&app.runtime.isCurrent(view),cutoff:frame.cutoff}};
 let scope=readScope();const session=createAdminPresentationSession(app.frame.getSnapshot().contextKey,scope.identity,['inspect']);
 const fresh=()=>({...scope,epoch,phase,query:'',sort:'ascending' as LedgerSort,selected:null as string|null,busy:false,outcome:'No local ledger inspection'}),state=store(fresh());
 const present=()=>scope.available&&(phase==='ready'||phase==='long'||phase==='empty');
 const admitted=()=>present()&&phase!=='empty'?ledgerPrefix(scope.cutoff):[];
 const rows=()=>{const s=state.getSnapshot(),query=s.query.toLocaleLowerCase('en-US');return admitted().filter(row=>`${row.id} ${row.kind} ${row.rawType} ${row.reference??''} ${row.message}`.toLocaleLowerCase('en-US').includes(query)).sort((a,b)=>(s.sort==='ascending'?1:-1)*(a.at-b.at||a.id.localeCompare(b.id)))};
 function refresh(){if(disposed)return;const next=readScope();if(next.identity===scope.identity&&next.available===scope.available)return;scope=next;epoch++;session.reset(app.frame.getSnapshot().contextKey,`${scope.identity}/${epoch}`);state.set(fresh())}
 function change(update:Partial<ReturnType<typeof fresh>>){epoch++;session.reset(app.frame.getSnapshot().contextKey,`${scope.identity}/${epoch}`);state.set({...state.getSnapshot(),...update,epoch,busy:false,outcome:'No local ledger inspection'})}
 const releaseLayout=app.layouts.get('operations.detail')?.subscribe(refresh)??(()=>{});
 function capture(){refresh();const identity=scope.identity,lease=epoch;const valid=()=>{refresh();return !disposed&&scope.available&&scope.identity===identity&&epoch===lease};return{
  phase(value:LedgerPhase){if(valid()&&['ready','empty','loading','error','denied','unknown','long'].includes(value)){phase=value;refresh()}},
  query(value:string){if(valid()&&present()&&typeof value==='string')change({query:value,selected:null})},
  sort(value:LedgerSort){if(valid()&&present()&&['ascending','descending'].includes(value))change({sort:value,selected:null})},
  select(id:string){if(valid()&&present()&&rows().some(row=>row.id===id))change({selected:id})},
  clear(){if(valid()&&present())change({selected:null})},
  hold(){const target=state.getSnapshot().selected;if(!valid()||!present()||!target||state.getSnapshot().busy||!rows().some(row=>row.id===target))return;const ticket=session.begin('inspect'),stamp=++epoch;state.set({...state.getSnapshot(),epoch,busy:true,outcome:'Held readonly authored record inspection; no fetch or execution'});void new Promise<void>(resolve=>pending.push(resolve)).then(()=>{refresh();const live=state.getSnapshot(),row=rows().find(row=>row.id===target);if(disposed||!present()||scope.identity!==identity||epoch!==stamp||live.selected!==target||!row){ticket.cancel();return}ticket.commit(()=>state.set({...live,busy:false,outcome:`Inspected ${row.id} locally; authored ledger and registry unchanged`}))})}
 }}
 return{state,refresh,rows,admitted,present,capture,current(identity:string,lease:number){refresh();return !disposed&&scope.identity===identity&&epoch===lease},release(){pending.splice(0).forEach(resolve=>resolve())},dispose(){if(disposed)return;disposed=true;releaseLayout();epoch++;session.dispose();state.set({...fresh(),available:false,selected:null,busy:false})}};
}
