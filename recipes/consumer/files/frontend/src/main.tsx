import './style.css'
import {AppShell} from '@hollis-labs/design-components'
import {createRoot} from 'react-dom/client'
import {StrictMode,useEffect,useRef,useState} from 'react'
import {Plugin} from './Plugin.js'

const currentRoute=()=>location.hash==='#evidence'?'evidence':'overview'
function App(){
 const [route,setRoute]=useState(currentRoute),heading=useRef<HTMLHeadingElement>(null),navigated=useRef(false)
 useEffect(()=>{const changed=()=>{navigated.current=true;setRoute(currentRoute())};addEventListener('hashchange',changed);return()=>removeEventListener('hashchange',changed)},[])
 useEffect(()=>{if(!navigated.current)return;const node=heading.current;const id=requestAnimationFrame(()=>{if(node?.isConnected)node.focus()});return()=>cancelAnimationFrame(id)},[route])
 return <AppShell header={<header className="recipe-header"><a className="recipe-skip" href="#content" onClick={event=>{event.preventDefault();heading.current?.focus()}}>Skip to content</a><div><strong>Consumer shell</strong><p>Authored offline presentation · no providers or business actions</p></div><nav aria-label="Recipe destinations">{['overview','evidence'].map(name=><a key={name} href={`#${name}`} aria-current={route===name?'page':undefined}>{name==='overview'?'Overview':'Evidence'}</a>)}</nav></header>}>
  <div className="recipe-main" tabIndex={0} aria-label="Recipe page scroll"><h1 id="content" ref={heading} tabIndex={-1}>{route==='overview'?'Published shell overview':'Readonly evidence'}</h1>{route==='overview'?<><p>This viewport uses the released AppShell and semantic theme utilities. The app owns routes, selection and scrolling; Chimera supplies HTTP assembly and shutdown.</p><dl><dt>Snapshot</dt><dd>authored-shell/v1</dd><dt>Clock</dt><dd>2026-10-08T12:00:00Z (fixed authored snapshot)</dd><dt>Known count</dt><dd>0</dd><dt>Provider observation</dt><dd>Unknown — not collected</dd></dl><Plugin/><p><a href="#evidence">Inspect supplied evidence</a></p></>:<><p>Finite readonly authored records; these are not fetched production logs or fake-ops business records.</p>{Array.from({length:24},(_,i)=><article key={i}><h2>Authored item {i+1}</h2><p>Literal evidence {i===23?'END OF FINITE EVIDENCE':'no provider connected'}; supplied reference {i%3===0?'0':i%3===1?'null':'Unknown / absent'}.</p></article>)}<a href="#overview">Return to overview</a></>}</div>
  <footer className="recipe-footer">One viewport shell · one page scroll owner · ephemeral navigation only</footer>
 </AppShell>
}
createRoot(document.getElementById('root')!).render(<StrictMode><App/></StrictMode>)
