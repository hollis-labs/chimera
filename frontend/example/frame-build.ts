import {buildFrameArtifacts,buildFrameBootstrap} from '@hollis-labs/plugin-host-ui/vite'
import {createFrameDocument} from '@hollis-labs/plugin-host-ui/isolation'
import {build,type Plugin} from 'vite'
import tailwindcss from '@tailwindcss/vite'
import {mkdir,writeFile} from 'node:fs/promises'
import {fileURLToPath} from 'node:url'
export async function frameFixture(root:string):Promise<Plugin>{
 const scratch=fileURLToPath(new URL('../../.scratch/frame-build/',import.meta.url));await mkdir(scratch,{recursive:true})
 const cssResult=await build({root,configFile:false,logLevel:'silent',plugins:[tailwindcss()],build:{write:false,rollupOptions:{input:`${root}/example/frame-style.css`}}})
 const cssBundle=Array.isArray(cssResult)?cssResult[0]:cssResult
 if(!('output' in cssBundle))throw new Error('frame CSS watcher unsupported')
 const cssAsset=cssBundle.output.find(item=>item.type==='asset'&&item.fileName.endsWith('.css'));if(!cssAsset||cssAsset.type!=='asset')throw new Error('frame CSS unavailable')
 await writeFile(`${scratch}/frame.css`,cssAsset.source)
 await writeFile(`${scratch}/frame-ui.js`,`import ${JSON.stringify(`${scratch}/frame.css`)};export {Button} from ${JSON.stringify(`${root}/node_modules/@hollis-labs/design-components/dist/index.js`)};`)
 const entries=[]
 for(const specifier of ['react','react-dom','react-dom/client','react/jsx-runtime']){const module=await import(specifier);entries.push({specifier,source:specifier,exports:Object.keys(module).filter(name=>name!=='default'&&/^[A-Za-z_$][\w$]*$/.test(name)),defaultExport:Object.hasOwn(module,'default')})}
 entries.push({specifier:'@chimera/ui',source:`${scratch}/frame-ui.js`,exports:['Button'],defaultExport:false})
 const inventory=await buildFrameArtifacts({root,entries}),bootstrap=await buildFrameBootstrap()
 const template=await createFrameDocument(bootstrap,{frameId:'0'.repeat(64),nonce:'1'.repeat(64),parentOrigin:'https://frame-template.invalid'})
 const documentNonce=template.csp.match(/'nonce-([^']+)'/)![1]
 const replace=(value:string)=>value.replaceAll('0'.repeat(64),'__FRAME_ID__').replaceAll('1'.repeat(64),'__BRIDGE_NONCE__').replaceAll('https://frame-template.invalid','__PARENT_ORIGIN__').replaceAll(documentNonce,'__DOCUMENT_NONCE__')
 const fixture={...inventory,bootstrap}
 return {name:'chimera-frame-fixture',resolveId(id){return id==='virtual:chimera/frame-fixture'?'\0chimera-frame-fixture':undefined},load(id){if(id==='\0chimera-frame-fixture')return `export default ${JSON.stringify(fixture)}`},generateBundle(){this.emitFile({type:'asset',fileName:'frame-document.json',source:JSON.stringify({html:replace(template.html),csp:replace(template.csp),permissionsPolicy:template.permissionsPolicy})})}}
}
