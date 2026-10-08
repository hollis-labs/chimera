import {createAdminPresentationSession} from '../src/admin-session.js';
import {store} from '../src/store.js';
import type {createPlaybackFixture} from './playback-fixture.js';
export const appearanceThemes=[{id:'sysop-green-phosphor',name:'P1 Green'},{id:'sysop-amber-phosphor',name:'P3 Amber'},{id:'sysop-p4-white',name:'P4 White'},{id:'sysop-hi-contrast',name:'Hi-Contrast'}] as const;
export type AppearanceMode='light'|'dark'|'system';
export type AppearancePhase='ready'|'loading'|'error'|'denied'|'unknown';
export type AppearanceMedia={readonly matches:boolean;addEventListener(type:'change',listener:()=>void):void;removeEventListener(type:'change',listener:()=>void):void};
export function createAppearanceReview(app:ReturnType<typeof createPlaybackFixture>,media:AppearanceMedia){
 let disposed=false,epoch=0,scopeVersion=0,releaseMedia=()=>{},phase:AppearancePhase='ready';const pending:(()=>void)[]=[];
 const readScope=()=>{const frame=app.frame.getSnapshot(),view=app.select('operations.detail').find(v=>v.ref.owner==='fake-ops');return{identity:`${frame.contextKey}/${frame.sourceKey}/${frame.epoch}/${frame.cutoff}/${view?.ref.hostInstance}/${view?.id}/${view?.ref.owner}/${view?.ref.generation}/${phase}`,available:!!view&&app.runtime.isCurrent(view)}};
 let scope=readScope();const session=createAdminPresentationSession(app.frame.getSnapshot().contextKey,scope.identity,['inspect']);
 const fresh=()=>({...scope,epoch,phase,theme:'sysop-p4-white' as string,mode:'system' as AppearanceMode,systemDark:media.matches,annotations:true,dense:false,busy:false,outcome:'No local appearance inspection'}),state=store(fresh());
 const present=()=>!disposed&&scope.available&&phase==='ready'&&appearanceThemes.some(t=>t.id===state.getSnapshot().theme);
 function refresh(){if(disposed)return;const next=readScope();if(next.identity===scope.identity&&next.available===scope.available)return;scope=next;scopeVersion++;epoch++;session.reset(app.frame.getSnapshot().contextKey,`${scope.identity}/${epoch}`);state.set(fresh());bindMedia()}
 function change(update:Partial<ReturnType<typeof fresh>>){epoch++;session.reset(app.frame.getSnapshot().contextKey,`${scope.identity}/${epoch}`);state.set({...state.getSnapshot(),...update,epoch,busy:false,outcome:'No local appearance inspection'})}
 // Host-scope listener leases survive ordinary controls, but are replaced on actual scope retirement.
 function bindMedia(){releaseMedia();const version=scopeVersion;const listener=()=>{refresh();if(disposed||scopeVersion!==version||!present()||state.getSnapshot().mode!=='system')return;change({systemDark:media.matches})};media.addEventListener('change',listener);releaseMedia=()=>media.removeEventListener('change',listener)}
 bindMedia();const releaseLayout=app.layouts.get('operations.detail')?.subscribe(refresh)??(()=>{});
 function capture(){refresh();const identity=scope.identity,lease=epoch;const valid=()=>{refresh();return !disposed&&scope.available&&scope.identity===identity&&epoch===lease};return{
  phase(value:AppearancePhase){if(valid()&&['ready','loading','error','denied','unknown'].includes(value)){phase=value;refresh()}},
  theme(value:string){if(valid()&&present()&&appearanceThemes.some(t=>t.id===value))change({theme:value})},
  mode(value:AppearanceMode){if(valid()&&present()&&['light','dark','system'].includes(value))change({mode:value,systemDark:media.matches})},
  annotations(value:boolean){if(valid()&&present()&&typeof value==='boolean')change({annotations:value})},
  dense(value:boolean){if(valid()&&present()&&typeof value==='boolean')change({dense:value})},
  inspect(){if(!valid()||!present()||state.getSnapshot().busy)return;const ticket=session.begin('inspect'),stamp=++epoch,candidate=state.getSnapshot();state.set({...candidate,epoch,busy:true,outcome:'Held readonly appearance candidate; no preference save'});void new Promise<void>(resolve=>pending.push(resolve)).then(()=>{refresh();const live=state.getSnapshot();if(disposed||!present()||scope.identity!==identity||epoch!==stamp){ticket.cancel();return}ticket.commit(()=>state.set({...live,busy:false,outcome:`Inspected ${candidate.theme}/${candidate.mode} locally; no persisted preference or provider effect`}))})}
 }}
 return{state,refresh,present,capture,current(identity:string,lease:number){refresh();return !disposed&&scope.identity===identity&&epoch===lease},release(){pending.splice(0).forEach(resolve=>resolve())},dispose(){if(disposed)return;disposed=true;releaseLayout();releaseMedia();epoch++;session.dispose();state.set({...fresh(),available:false,busy:false})}};
}
