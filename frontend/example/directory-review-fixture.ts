import {createAdminPresentationSession} from '../src/admin-session.js';
import {store} from '../src/store.js';
import type {createPlaybackFixture} from './playback-fixture.js';
export const directorySnapshotClock='2026-10-05T10:00:00.000Z';
export const directoryProfiles=Object.freeze([
 {id:'ada',label:'Ada — fictional reviewer',tag:'reviewed',roles:['reviewer'],note:'Authored readonly profile; no identity verification or grants.'},
 {id:'mira',label:'Mira — fictional observer',tag:'unclassified',roles:[],note:'Known zero supplied role references, not missing data.'},
 {id:'sol',label:'Sol — fictional long profile with unknown metadata',tag:'future-tag',roles:['missing-role'],note:'<script>globalThis.directoryExecuted = true</script>'}
]);
export const directoryRoles=Object.freeze([{id:'reviewer',label:'Fixture reviewer metadata',permissions:['inspect-artifact','missing-permission']}]);
export const directoryPermissions=Object.freeze([{id:'inspect-artifact',label:'Supplied inspection label (not a grant)'}]);
export type DirectoryTab='profile'|'relationships'|'provenance';
export type DirectoryPhase='ready'|'empty'|'loading'|'error'|'denied'|'unknown'|'long';
export function createDirectoryReview(app:ReturnType<typeof createPlaybackFixture>){
 let disposed=false,epoch=0,phase:DirectoryPhase='ready';const pending:(()=>void)[]=[];let closeToken:null|{identity:string;from:number;to:number;profile:string;tab:DirectoryTab}=null;
 const scope=()=>{const frame=app.frame.getSnapshot(),view=app.select('operations.detail').find(v=>v.ref.owner==='fake-ops');return{identity:`${frame.contextKey}/${frame.sourceKey}/${frame.epoch}/${frame.cutoff}/${view?.ref.hostInstance}/${view?.id}/${view?.ref.owner}/${view?.ref.generation}/${phase}`,available:!!view&&app.runtime.isCurrent(view)}};
 let current=scope();const session=createAdminPresentationSession(app.frame.getSnapshot().contextKey,current.identity,['inspect']);
 const fresh=()=>({...current,epoch,phase,profile:'ada',tab:'profile' as DirectoryTab,popup:false,busy:false,outcome:'No local directory inspection'});const state=store(fresh());
 function refresh(){if(disposed)return;const next=scope();if(next.identity===current.identity&&next.available===current.available)return;current=next;closeToken=null;epoch++;session.reset(app.frame.getSnapshot().contextKey,`${current.identity}/${epoch}`);state.set(fresh())}
 function change(update:Partial<ReturnType<typeof fresh>>){closeToken=null;epoch++;session.reset(app.frame.getSnapshot().contextKey,`${current.identity}/${epoch}`);state.set({...state.getSnapshot(),...update,epoch,busy:false,outcome:'No local directory inspection'})}
 const releaseLayout=app.layouts.get('operations.detail')?.subscribe(refresh)??(()=>{});
 const selected=()=>directoryProfiles.find(profile=>profile.id===state.getSnapshot().profile)!;
 const present=()=>current.available&&(phase==='ready'||phase==='long');
 function capture(){refresh();const identity=current.identity,lease=epoch;const valid=()=>{refresh();return !disposed&&current.identity===identity&&current.available&&epoch===lease};return{
  phase(value:DirectoryPhase){if(valid()&&['ready','empty','loading','error','denied','unknown','long'].includes(value)){phase=value;refresh()}},
  profile(value:string){if(valid()&&present()&&directoryProfiles.some(p=>p.id===value))change({profile:value,popup:false,tab:'profile'})},
  tab(value:unknown){if(valid()&&present()&&typeof value==='string'&&['profile','relationships','provenance'].includes(value))change({tab:value as DirectoryTab,popup:false})},
  popup(value:boolean,restoreOrigin=true){if(!valid()||!present())return;if(value){change({popup:true});return}const live=state.getSnapshot(),from=epoch;if(!live.popup)return;change({popup:false});if(restoreOrigin)closeToken={identity:current.identity,from,to:epoch,profile:live.profile,tab:live.tab}},
  hold(){if(!valid()||!present()||state.getSnapshot().busy)return;const target={profile:state.getSnapshot().profile,tab:state.getSnapshot().tab,popup:state.getSnapshot().popup},ticket=session.begin('inspect'),stamp=++epoch;state.set({...state.getSnapshot(),epoch,busy:true,outcome:'Held readonly directory metadata inspection; no auth or save'});void new Promise<void>(resolve=>pending.push(resolve)).then(()=>{refresh();const live=state.getSnapshot();if(disposed||!present()||current.identity!==identity||epoch!==stamp||live.profile!==target.profile||live.tab!==target.tab||live.popup!==target.popup||!directoryProfiles.some(p=>p.id===target.profile)){ticket.cancel();return}ticket.commit(()=>state.set({...live,busy:false,outcome:`Inspected ${target.profile} ${target.tab} supplied metadata locally; snapshot unchanged`}))})}
 }}
 return{state,refresh,capture,selected,present,current(identity:string,lease?:number){refresh();return !disposed&&current.identity===identity&&(lease===undefined||epoch===lease)},canRestore(identity:string,lease:number){refresh();const live=state.getSnapshot();return !disposed&&present()&&!!closeToken&&current.identity===identity&&closeToken.identity===identity&&(lease===closeToken.from||lease===closeToken.to)&&epoch===closeToken.to&&live.profile===closeToken.profile&&live.tab===closeToken.tab&&!live.popup},release(){pending.splice(0).forEach(resolve=>resolve())},dispose(){if(disposed)return;disposed=true;releaseLayout();epoch++;closeToken=null;session.dispose();state.set({...fresh(),available:false,popup:false,busy:false})}};
}
