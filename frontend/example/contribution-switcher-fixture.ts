import type {ContributionView} from '@hollis-labs/plugin-host-ui';
import {createAdminPresentationSession} from '../src/admin-session.js';
import {store} from '../src/store.js';
import type {createPlaybackFixture} from './playback-fixture.js';
export type SwitcherPhase='ready'|'loading'|'error'|'denied'|'unknown'|'long';
/** Native option identity only; never a wire DTO or executable action. */
export function switcherValue(view:ContributionView){return JSON.stringify([view.ref.hostInstance,view.id,view.ref.owner,view.ref.generation,view.ref.kind,view.ref.key])}
export function createContributionSwitcher(app:ReturnType<typeof createPlaybackFixture>){
 let disposed=false,epoch=0,highlightRevision=0,phase:SwitcherPhase='ready';const pending:(()=>void)[]=[];
 const scope=()=>{const f=app.frame.getSnapshot();return `${app.runtime.getSnapshot().hostInstance}/${f.contextKey}/${f.sourceKey}/${f.epoch}/${f.cutoff}/${phase}`};
 let identity=scope();const session=createAdminPresentationSession(app.frame.getSnapshot().contextKey,identity,['inspect']);
 const fresh=()=>({identity,epoch,highlightRevision,phase,query:'',highlight:'',selected:null as string|null,busy:false,outcome:'No local switcher inspection'}),state=store(fresh());
 const rows=()=>app.runtime.getSnapshot().views;
 function eligible(view:ContributionView){return app.runtime.isCurrent(view)&&view.availability==='available'&&view.representation==='component'&&(view.ref.kind==='widget'||view.ref.kind==='panel')&&app.catalog.regions.some(r=>r.name===view.region&&r.representation==='component'&&r.kinds.includes(view.ref.kind))&&app.select(view.region).some(v=>switcherValue(v)===switcherValue(view)&&app.runtime.isCurrent(v))}
 const present=()=>phase==='ready'||phase==='long';
 const selected=()=>{const s=state.getSnapshot();return rows().find(view=>switcherValue(view)===s.selected&&eligible(view))};
 function reset(update:Partial<ReturnType<typeof fresh>>){epoch++;highlightRevision++;session.reset(app.frame.getSnapshot().contextKey,`${identity}/${epoch}/${highlightRevision}`);state.set({...state.getSnapshot(),...update,identity,epoch,highlightRevision,busy:false,outcome:'No local switcher inspection'})}
 function refresh(){if(disposed)return;const next=scope();if(next!==identity){identity=next;epoch++;highlightRevision++;session.reset(app.frame.getSnapshot().contextKey,`${identity}/${epoch}/${highlightRevision}`);state.set(fresh());return}const live=state.getSnapshot();if(live.selected&&!selected()||live.highlight&&!rows().some(view=>switcherValue(view)===live.highlight&&eligible(view)))reset({query:'',highlight:'',selected:null})}
 const releases=Array.from(app.layouts.values(),layout=>layout.subscribe(refresh));
 function capture(){refresh();const capturedIdentity=identity,lease=epoch;const valid=()=>{refresh();return !disposed&&identity===capturedIdentity&&epoch===lease};return{
  phase(value:SwitcherPhase){if(valid()&&['ready','loading','error','denied','unknown','long'].includes(value)){phase=value;refresh()}},
  query(value:string){if(valid()&&present()&&typeof value==='string')reset({query:value,highlight:'',selected:null})},
  highlight(value:string){if(!valid()||!present()||typeof value!=='string'||value!==''&&!rows().some(view=>switcherValue(view)===value&&eligible(view)))return;if(value===state.getSnapshot().highlight)return;highlightRevision++;session.reset(app.frame.getSnapshot().contextKey,`${identity}/${epoch}/${highlightRevision}`);state.set({...state.getSnapshot(),highlight:value,highlightRevision,selected:null,busy:false,outcome:'No local switcher inspection'})},
  activate(value:string){if(!valid()||!present()||typeof value!=='string'||value!==state.getSnapshot().highlight)return;const view=rows().find(view=>switcherValue(view)===value&&eligible(view));if(view)reset({selected:value})},
  close(){if(valid())reset({selected:null})},
  hold(){if(!valid()||!present()||state.getSnapshot().busy)return;const view=selected();if(!view)return;const target=switcherValue(view),highlight=highlightRevision,ticket=session.begin('inspect');epoch++;const heldEpoch=epoch;state.set({...state.getSnapshot(),epoch,busy:true,outcome:'Held readonly current-ref inspection; no action execution'});void new Promise<void>(resolve=>pending.push(resolve)).then(()=>{refresh();const current=selected();if(disposed||!present()||identity!==capturedIdentity||epoch!==heldEpoch||highlightRevision!==highlight||!current||switcherValue(current)!==target||!eligible(current)){ticket.cancel();return}ticket.commit(()=>state.set({...state.getSnapshot(),busy:false,outcome:`Inspected ${current.ref.owner}/${current.ref.key} generation ${current.ref.generation} locally; registry unchanged`}))})}
 }}
 return{state,refresh,rows,selected,eligible,present,capture,release(){pending.splice(0).forEach(resolve=>resolve())},dispose(){if(disposed)return;disposed=true;releases.forEach(release=>release());epoch++;highlightRevision++;session.dispose();state.set({...fresh(),highlight:'',selected:null,busy:false})}};
}
