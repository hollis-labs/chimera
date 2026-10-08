import type {ContributionView} from '@hollis-labs/plugin-host-ui';
import {createAdminPresentationSession} from '../src/admin-session.js';
import {store} from '../src/store.js';
import type {createPlaybackFixture} from './playback-fixture.js';
type App=ReturnType<typeof createPlaybackFixture>;
export function contributionStamp(view:ContributionView){return `${view.ref.hostInstance}/${view.id}/${view.ref.owner}/${view.ref.generation}/${view.ref.kind}/${view.ref.key}`}
/** Private readonly consumer of actual runtime views, not a contribution schema. */
export function createContributionWorkbench(app:App){
 let disposed=false,epoch=0;const pending:(()=>void)[]=[];
 const scope=()=>{const f=app.frame.getSnapshot();return `${app.runtime.getSnapshot().hostInstance}/${f.contextKey}/${f.sourceKey}/${f.epoch}/${f.cutoff}`};
 let identity=scope();const session=createAdminPresentationSession(app.frame.getSnapshot().contextKey,identity,['inspect']);
 const fresh=()=>({identity,epoch,query:'',owner:'all',region:'all',selected:null as string|null,selectedStamp:null as string|null,preview:false,focus:'scope' as 'scope'|'selection'|'retirement'|'none',busy:false,outcome:'No local contribution inspection'});
 const state=store(fresh());
 const rows=()=>app.runtime.getSnapshot().views;
 const current=(view:ContributionView)=>app.runtime.isCurrent(view);
 const filtered=()=>{const s=state.getSnapshot(),q=s.query.toLowerCase().trim();return rows().filter(v=>(s.owner==='all'||v.ref.owner===s.owner)&&(s.region==='all'||v.region===s.region)&&`${v.label} ${v.ref.owner} ${v.ref.kind} ${v.region} ${v.representation}`.toLowerCase().includes(q))};
 const selected=()=>{const s=state.getSnapshot();return rows().find(v=>v.id===s.selected&&contributionStamp(v)===s.selectedStamp&&current(v))};
 function reset(update:Partial<ReturnType<typeof fresh>>){epoch++;session.reset(app.frame.getSnapshot().contextKey,`${identity}/${epoch}`);state.set({...state.getSnapshot(),focus:'none',...update,identity,epoch,busy:false,outcome:'No local contribution inspection'})}
 function refresh(){if(disposed)return;const next=scope();if(next!==identity){identity=next;epoch++;session.reset(app.frame.getSnapshot().contextKey,`${identity}/${epoch}`);state.set(fresh());return}const s=state.getSnapshot();if(s.preview&&selected()&&!eligible(selected()!))reset({preview:false,focus:'retirement'});if(s.selected&&!selected())reset({selected:null,selectedStamp:null,preview:false,focus:'retirement'});if(s.owner!=='all'&&!rows().some(v=>v.ref.owner===s.owner))reset({owner:'all',selected:null,selectedStamp:null,preview:false});}
 function eligible(view:ContributionView){return current(view)&&view.availability==='available'&&view.representation==='component'&&(view.ref.kind==='widget'||view.ref.kind==='panel')&&app.select(view.region).some(v=>contributionStamp(v)===contributionStamp(view)&&current(v))&&app.catalog.regions.some(r=>r.name===view.region&&r.representation==='component'&&r.kinds.includes(view.ref.kind))}
 function capture(){refresh();const capturedIdentity=identity,lease=epoch;const valid=()=>{refresh();return !disposed&&identity===capturedIdentity&&epoch===lease};return{
  query(value:string){if(valid())reset({query:value,selected:null,selectedStamp:null,preview:false})},
  owner(value:string){if(valid()&&(value==='all'||rows().some(v=>v.ref.owner===value)))reset({owner:value,selected:null,selectedStamp:null,preview:false})},
  region(value:string){if(valid()&&(value==='all'||app.catalog.regions.some(r=>r.name===value)))reset({region:value,selected:null,selectedStamp:null,preview:false})},
  select(id:string){if(!valid())return;const view=filtered().find(v=>v.id===id&&current(v));if(view)reset({selected:id,selectedStamp:contributionStamp(view),preview:false,focus:'selection'})},
  preview(value:boolean){if(valid()){const v=selected();if(v&&(!value||eligible(v)))reset({preview:value})}},
  hold(){if(!valid()||state.getSnapshot().busy)return;const view=selected();if(!view)return;const stamp=contributionStamp(view),ticket=session.begin('inspect');epoch++;state.set({...state.getSnapshot(),epoch,busy:true,outcome:'Held readonly selected-ref inspection; no action execution'});const heldEpoch=epoch;void new Promise<void>(resolve=>pending.push(resolve)).then(()=>{refresh();const v=selected();if(disposed||identity!==capturedIdentity||epoch!==heldEpoch||!v||!current(v)||contributionStamp(v)!==stamp||(state.getSnapshot().preview&&!eligible(v))){ticket.cancel();return}ticket.commit(()=>state.set({...state.getSnapshot(),busy:false,outcome:`Inspected ${v.ref.owner}/${v.ref.key} generation ${v.ref.generation} locally; registry unchanged`}))})}
 }}
 return{state,refresh,rows,filtered,selected,eligible,capture,current(identityValue:string,lease?:number){refresh();return !disposed&&identity===identityValue&&(lease===undefined||epoch===lease)},release(){pending.splice(0).forEach(resolve=>resolve())},dispose(){if(disposed)return;disposed=true;epoch++;session.dispose();state.set({...fresh(),selected:null,preview:false})}};
}
