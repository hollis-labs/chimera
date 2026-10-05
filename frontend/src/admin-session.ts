/** Optional host presentation lifetime fence. This does not cancel or roll back
 * backend effects. Apps own validated kit projections, channels and draft policy. */
export interface AdminPresentationTicket {
 readonly signal: AbortSignal
 /** Execute a synchronous local state commit only while this request is current.
  * Capture payloads outside this callback; do not launch async effects within it. */
 commit(callback:()=>void): boolean
 cancel(): void
}
export function createAdminPresentationSession(contextKey:string,sourceKey:string,channels:readonly string[]) {
 const allowed=new Set(channels)
 if(!contextKey||!sourceKey||!allowed.size||allowed.size!==channels.length||channels.some(key=>!key))throw new Error('Explicit unique admin channels and context/source required')
 let context=contextKey,source=sourceKey,disposed=false,epoch=0
 const pending=new Map<string,AbortController>()
 function retire(){epoch++;for(const controller of pending.values())controller.abort();pending.clear()}
 return {
  begin(channel:string):AdminPresentationTicket {
   if(disposed)throw new Error('Admin presentation session disposed')
   if(!allowed.has(channel))throw new Error('Undeclared admin presentation channel')
   pending.get(channel)?.abort();const controller=new AbortController(),stamp=epoch;pending.set(channel,controller)
   const current=()=>!disposed&&!controller.signal.aborted&&stamp===epoch&&pending.get(channel)===controller
   return {signal:controller.signal,commit(callback){if(!current())return false;pending.delete(channel);try{callback()}finally{controller.abort()}return true},cancel(){controller.abort();if(pending.get(channel)===controller)pending.delete(channel)}}
  },
  /** Change identity before the app synchronously clears old snapshots/drafts.
   * Same-identity reset is idempotent; use a new source key for source retirement. */
  reset(nextContext:string,nextSource:string){if(disposed)return;if(!nextContext||!nextSource)throw new Error('Admin context/source required');if(nextContext===context&&nextSource===source)return;context=nextContext;source=nextSource;retire()},
  dispose(){if(disposed)return;disposed=true;retire()}
 }
}
