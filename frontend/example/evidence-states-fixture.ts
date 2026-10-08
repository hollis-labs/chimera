import {store} from '../src/store.js';
import type {createPlaybackFixture} from './playback-fixture.js';
export type EvidencePhase='ready'|'empty'|'loading'|'error'|'denied'|'unknown'|'long';
export function createEvidenceStates(app:ReturnType<typeof createPlaybackFixture>){
 let disposed=false,epoch=0,phase:EvidencePhase='ready';
 const readScope=()=>{const frame=app.frame.getSnapshot(),view=app.select('operations.detail').find(v=>v.ref.owner==='fake-ops');return{identity:`${frame.contextKey}/${frame.sourceKey}/${frame.epoch}/${frame.cutoff}/${view?.ref.hostInstance}/${view?.id}/${view?.ref.owner}/${view?.ref.generation}/${phase}`,available:!!view&&app.runtime.isCurrent(view),count:frame.index,utc:new Date(frame.cutoff).toISOString()}};
 let scope=readScope();const fresh=()=>({...scope,epoch,phase,open:false,delayed:false}),state=store(fresh());
 const present=()=>!disposed&&scope.available&&(phase==='ready'||phase==='empty'||phase==='long');
 function refresh(){if(disposed)return;const next=readScope();if(next.identity===scope.identity&&next.available===scope.available)return;scope=next;epoch++;state.set(fresh())}
 const releaseLayout=app.layouts.get('operations.detail')?.subscribe(refresh)??(()=>{});
 function capture(){refresh();const identity=scope.identity,lease=epoch;const valid=()=>{refresh();return !disposed&&scope.available&&scope.identity===identity&&epoch===lease};return{phase(value:EvidencePhase){if(valid()&&['ready','empty','loading','error','denied','unknown','long'].includes(value)){phase=value;refresh()}},open(value:boolean){if(valid()&&present()&&typeof value==='boolean'){epoch++;state.set({...state.getSnapshot(),epoch,open:value})}},delay(){if(valid()&&present()){epoch++;state.set({...state.getSnapshot(),epoch,open:false,delayed:!state.getSnapshot().delayed})}}}}
 return{state,refresh,present,capture,count(){return present()?(phase==='empty'?0:scope.count):null},current(identity:string,lease:number){refresh();return !disposed&&scope.identity===identity&&epoch===lease},dispose(){if(disposed)return;disposed=true;releaseLayout();epoch++;state.set({...fresh(),available:false,open:false})}};
}
