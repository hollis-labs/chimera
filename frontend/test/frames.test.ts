import {describe,it,expect} from 'vitest'
import type {AppIsolationSnapshot,HostScope} from '@hollis-labs/plugin-host-ui'
import {store} from '../src/store.js'
import {createIsolatedComposition} from '../src/frames.js'
import {memoryLayoutStorage} from '../src/composition.js'
function options(path='/'){
 const value=store<AppIsolationSnapshot>({appId:'frame-test',effectiveMode:'sandboxed-frame',revision:'reviewed'});let subscribers=0
 const isolation={...value,subscribe(listener:()=>void){subscribers++;const release=value.subscribe(listener);let active=true;return()=>{if(active){active=false;subscribers--;release()}}}}
 const scope:HostScope={appId:'frame-test',environmentId:'fixture',clientId:'test'}
 return {subscribers:()=>subscribers,input:{scope,isolation,renderContext:store<Readonly<Record<string,unknown>>>({}),registryOptions:{kinds:{},regions:{},stylesheets:false as const},catalog:{kinds:[],regions:[{name:'body',representation:'component' as const,kinds:[],widgetKinds:[],ordering:'manifest' as const}],reserved:()=>false},routes:[{id:'body',label:'Body',path,region:'body'}],storage:memoryLayoutStorage(),frame:{document:{defaultView:{location:{origin:'http://127.0.0.1:18543'}}} as unknown as Document,bootstrap:'',delivery:{async provision(){throw new Error('not mounted')}},review(){throw new Error('not imported')},bindings:()=>[],props:()=>({}),diagnostics:()=>{}}}}
}
describe('shared frame integration lifecycle',()=>{
 it('disposal immediately releases subscriptions without a later microtask reattachment',async()=>{const f=options();const app=createIsolatedComposition(f.input);expect(f.subscribers()).toBeGreaterThan(0);await app.dispose();await Promise.resolve();expect(f.subscribers()).toBe(0);await app.dispose();expect(f.subscribers()).toBe(0)})
 it('invalid app route policy releases the acquired controller subscriptions',()=>{const f=options('//external');expect(()=>createIsolatedComposition(f.input)).toThrow('Invalid host route policy');expect(f.subscribers()).toBe(0)})
})
