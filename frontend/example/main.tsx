import './styles.css'
import { createRoot } from 'react-dom/client'
import { useEffect,useState } from 'react'
import {PluginHostProvider,WidgetRenderer,PluginPanelBody,usePluginSlots} from '@hollis-labs/plugin-host-ui/react'
import {createOperationsExample} from '../src/example.js'
import {createStylesheetLeases} from 'virtual:plugin-host-ui/stylesheets'
import {leasedStylesheets} from '../src/stylesheets.js'
const leases=createStylesheetLeases(document)
const stylesheetSink=leasedStylesheets(leases,(_leaseKey,url)=>
 url==='/plugins/fake-ops/g1/style.css'?{owner:'fake-ops',generation:'g1'}:undefined)
const app=createOperationsExample(route=>{location.hash=route},stylesheetSink)
function Views(){const widgets=usePluginSlots('operations.summary'),panels=usePluginSlots('operations.detail');return <main className="p-4 space-y-3 text-fg"><h1>Isolated fake control plane</h1><p>All provider observations are read-only fixtures.</p><section aria-label="Plugin widgets">{widgets.map(widget=><WidgetRenderer key={widget.id} widget={widget}/>)}</section><section aria-label="Plugin panels">{panels.map(panel=><PluginPanelBody key={panel.id} panel={panel}/>)}</section><button onClick={()=>{void app.registry.unload('fake-ops')}}>Unload fixture owner</button></main>}
function Startup(){const [error,setError]=useState('');useEffect(()=>{void app.load().catch(()=>setError('Plugin registry unavailable'));return()=>{void app.dispose().finally(()=>{stylesheetSink.dispose();leases.dispose()})}},[]);return error?<p role="alert">{error}</p>:<PluginHostProvider runtime={app.runtime}><Views/></PluginHostProvider>}
createRoot(document.getElementById('root')!).render(<Startup/> )
