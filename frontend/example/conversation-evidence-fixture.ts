import type {ToolState} from '@hollis-labs/kit-chat';
import {createAdminPresentationSession} from '../src/admin-session.js';
import {store} from '../src/store.js';
import type {createPlaybackFixture} from './playback-fixture.js';
export const authoredToolRecords=Object.freeze([
 {id:'running',label:'Authored running appearance',state:'running',input:{fixture:true},output:undefined,outputBoundary:1,duration:undefined},
 {id:'awaiting',label:'Authored awaiting-confirmation appearance',state:'awaiting-confirmation',input:{fixture:true},output:undefined,outputBoundary:1,duration:undefined},
 {id:'confirmed',label:'Authored confirmed appearance',state:'confirmed',input:{fixture:true},output:undefined,outputBoundary:1,duration:undefined},
 {id:'denied',label:'Authored denied appearance',state:'denied',input:{fixture:true},output:undefined,outputBoundary:1,duration:undefined},
 {id:'zero',label:'Known zero sample',state:'completed',input:{count:0,optional:null},output:0,outputBoundary:2,duration:0},
 {id:'null',label:'Explicit null sample',state:'completed',input:{note:'<script>globalThis.executed = true</script>'},output:null,outputBoundary:2,duration:undefined},
 {id:'missing',label:'Absent output sample',state:'pending',input:{count:0},output:undefined,outputBoundary:2,duration:undefined},
 {id:'error',label:'Authored error sample',state:'error',input:{candidate:'fictional metadata'},output:undefined,errorText:'Authored local refusal; no tool executes',outputBoundary:3,duration:2},
 {id:'unknown',label:'Unsupported raw state sample',state:'future-custom-status',input:{candidate:'withheld unsupported'},output:undefined,outputBoundary:2,duration:undefined}
]);
export const knownToolStates=['pending','running','awaiting-confirmation','confirmed','completed','denied','error'] as const;
export function projectedTool(id:string,index:number){const record=authoredToolRecords.find(record=>record.id===id)!;const supported=knownToolStates.includes(record.state as ToolState),resultAvailable=index>=record.outputBoundary;return{...record,label:resultAvailable?record.label:'Authored supplied input',supported,state:(supported?(resultAvailable?record.state:'pending'):record.state) as ToolState,output:resultAvailable?record.output:undefined,errorText:resultAvailable?record.errorText:undefined,duration:resultAvailable?record.duration:undefined,resultAvailable};}
export type ConversationEvidencePhase='ready'|'empty'|'loading'|'error'|'denied'|'unknown'|'locked'|'long';
export function createConversationEvidenceFixture(app:ReturnType<typeof createPlaybackFixture>){let disposed=false,lease=0,phase:ConversationEvidencePhase='ready';const pending:(()=>void)[]=[];
 const scope=()=>{const frame=app.frame.getSnapshot(),view=app.select('operations.detail').find(v=>v.ref.owner==='fake-ops');return{identity:`${frame.contextKey}/${frame.sourceKey}/${frame.epoch}/${frame.cutoff}/${view?.ref.hostInstance}/${view?.id}/${view?.ref.generation}/${phase}`,available:!!view&&app.runtime.isCurrent(view),admitted:frame.sourceKey==='source-a'&&frame.index>=1}};
 let current=scope();const session=createAdminPresentationSession(app.frame.getSnapshot().contextKey,current.identity,['inspection']);
 const fresh=()=>({...current,phase,controlEpoch:lease,selected:'zero',toolOpen:true,explanationOpen:true,sourcesOpen:true,busy:false,output:'No local conversation evidence inspection'});const state=store(fresh());
 function refresh(){if(disposed)return;const next=scope();if(next.identity===current.identity&&next.available===current.available&&next.admitted===current.admitted)return;current=next;lease++;session.reset(app.frame.getSnapshot().contextKey,`${current.identity}/${current.available}/${lease}`);state.set(fresh())}
 function change(update:Partial<ReturnType<typeof fresh>>){lease++;session.reset(app.frame.getSnapshot().contextKey,`${current.identity}/${lease}`);state.set({...state.getSnapshot(),...update,controlEpoch:lease,busy:false,output:'No local conversation evidence inspection'})}
 function capture(){refresh();const identity=current.identity,epoch=lease,valid=()=>{refresh();return !disposed&&current.available&&current.identity===identity&&lease===epoch},editable=()=>valid()&&current.admitted&&(phase==='ready'||phase==='long');return{
  phase(value:ConversationEvidencePhase){if(valid()&&['ready','empty','loading','error','denied','unknown','locked','long'].includes(value)){phase=value;refresh()}},
  select(id:string){if(editable()&&authoredToolRecords.some(record=>record.id===id))change({selected:id})},
  tool(value:boolean){if(editable())change({toolOpen:value})},explanation(value:boolean){if(editable())change({explanationOpen:value})},sources(value:boolean){if(editable())change({sourcesOpen:value})},
  hold(){if(!editable()||state.getSnapshot().busy)return;const selected=state.getSnapshot(),frame=app.frame.getSnapshot(),record=projectedTool(selected.selected,frame.index);if(!record.supported)return;const target={record:selected.selected,toolOpen:selected.toolOpen,explanationOpen:selected.explanationOpen,sourcesOpen:selected.sourcesOpen,index:frame.index},ticket=session.begin('inspection'),stamp=++lease;state.set({...selected,controlEpoch:lease,busy:true,output:'Held readonly conversation candidate; no send or tool execution'});void new Promise<void>(resolve=>pending.push(resolve)).then(()=>{refresh();const live=state.getSnapshot(),frame=app.frame.getSnapshot();if(disposed||!current.available||!current.admitted||current.identity!==identity||lease!==stamp||(phase!=='ready'&&phase!=='long')||live.selected!==target.record||live.toolOpen!==target.toolOpen||live.explanationOpen!==target.explanationOpen||live.sourcesOpen!==target.sourcesOpen||frame.index!==target.index||!projectedTool(live.selected,frame.index).supported){ticket.cancel();return}ticket.commit(()=>state.set({...live,busy:false,output:`Inspected authored ${target.record} prefix ${target.index} locally; supplied conversation unchanged`}))})}
 }}
 return{state,refresh,capture,current(identity:string,epoch?:number){refresh();return !disposed&&current.identity===identity&&(epoch===undefined||lease===epoch)},release(){pending.splice(0).forEach(resolve=>resolve())},dispose(){if(disposed)return;disposed=true;lease++;session.dispose();state.set({...fresh(),available:false,busy:false,output:'No local conversation evidence inspection'})}};
}
