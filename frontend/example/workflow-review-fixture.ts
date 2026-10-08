import {createAdminPresentationSession} from '../src/admin-session.js';
import {store} from '../src/store.js';
import type {createPlaybackFixture} from './playback-fixture.js';
export const workflowNodes=Object.freeze([{id:'plan',title:'Plan',description:'Authored offline plan metadata'},{id:'inspect',title:'Inspect',description:'Readonly review; no workflow execution'},{id:'report',title:'Report',description:'<script>globalThis.executed = true</script>'}]);
export const workflowRelations=Object.freeze([{id:'plan-inspect',source:'plan',target:'inspect'},{id:'inspect-report',source:'inspect',target:'report'}]);
export type WorkflowPhase='ready'|'empty'|'loading'|'error'|'denied'|'unknown'|'locked'|'long';
export function createWorkflowReviewFixture(app:ReturnType<typeof createPlaybackFixture>){let disposed=false,lease=0,phase:WorkflowPhase='ready';const pending:(()=>void)[]=[];
 const scope=()=>{const frame=app.frame.getSnapshot(),view=app.select('operations.detail').find(v=>v.ref.owner==='fake-ops');return{identity:`${frame.contextKey}/${frame.sourceKey}/${frame.epoch}/${frame.cutoff}/${view?.ref.hostInstance}/${view?.id}/${view?.ref.generation}/${phase}`,available:!!view&&app.runtime.isCurrent(view),admitted:frame.sourceKey==='source-a'&&frame.index>=2}};
 let current=scope();const session=createAdminPresentationSession(app.frame.getSnapshot().contextKey,current.identity,['inspection']);
 const fresh=()=>({...current,phase,controlEpoch:lease,selected:'plan',viewport:'overview' as 'overview'|'detail',busy:false,output:'No local workflow inspection'});const state=store(fresh());
 function refresh(){if(disposed)return;const next=scope();if(next.identity===current.identity&&next.available===current.available&&next.admitted===current.admitted)return;current=next;lease++;session.reset(app.frame.getSnapshot().contextKey,`${current.identity}/${current.available}/${lease}`);state.set(fresh())}
 function change(update:Partial<ReturnType<typeof fresh>>){lease++;session.reset(app.frame.getSnapshot().contextKey,`${current.identity}/${lease}`);state.set({...state.getSnapshot(),...update,controlEpoch:lease,busy:false,output:'No local workflow inspection'})}
 function capture(){refresh();const identity=current.identity,epoch=lease,valid=()=>{refresh();return !disposed&&current.available&&current.identity===identity&&lease===epoch},editable=()=>valid()&&current.admitted&&(phase==='ready'||phase==='long');return{
  phase(value:WorkflowPhase){if(valid()&&['ready','empty','loading','error','denied','unknown','locked','long'].includes(value)){phase=value;refresh()}},
  select(id:string){if(editable()&&workflowNodes.some(node=>node.id===id))change({selected:id})},
  relationship(id:string){const relation=workflowRelations.find(relation=>relation.id===id);if(editable()&&relation)change({selected:relation.target})},
  viewport(value:'overview'|'detail'){if(editable()&&(value==='overview'||value==='detail'))change({viewport:value})},
  hold(){if(!editable()||state.getSnapshot().busy)return;const selected=state.getSnapshot(),target={node:selected.selected,viewport:selected.viewport},ticket=session.begin('inspection'),stamp=++lease;state.set({...selected,controlEpoch:lease,busy:true,output:'Held local workflow candidate; no execution or graph mutation'});void new Promise<void>(resolve=>pending.push(resolve)).then(()=>{refresh();const live=state.getSnapshot();if(disposed||!current.available||!current.admitted||current.identity!==identity||lease!==stamp||(phase!=='ready'&&phase!=='long')||live.selected!==target.node||live.viewport!==target.viewport){ticket.cancel();return}ticket.commit(()=>state.set({...live,busy:false,output:`Inspected authored ${target.node}/${target.viewport} locally; graph unchanged`}))})}
 }}
 return{state,refresh,capture,current(identity:string,epoch?:number){refresh();return !disposed&&current.identity===identity&&(epoch===undefined||lease===epoch)},release(){pending.splice(0).forEach(resolve=>resolve())},dispose(){if(disposed)return;disposed=true;lease++;session.dispose();state.set({...fresh(),available:false,busy:false,output:'No local workflow inspection'})}};
}
