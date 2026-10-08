// Finite recipe materialization; no install/build/run or Folio behavior is hidden here.
import {readFile,writeFile,mkdir,cp,access} from 'node:fs/promises'
import {fileURLToPath} from 'node:url'
import {resolve,relative,dirname} from 'node:path'
import {createHash} from 'node:crypto'
import {gunzipSync} from 'node:zlib'
import {execFileSync} from 'node:child_process'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..'),variant=process.argv[2],target=resolve(root,'.scratch',process.argv[3]??`recipe-${variant}`)
if(!['shell','plugin'].includes(variant)||!relative(resolve(root,'.scratch'),target)||relative(resolve(root,'.scratch'),target).startsWith('..'))throw Error('Use shell|plugin and a new repo-local scratch directory')
try{await access(target);throw Error('Target already exists')}catch(e){if(e.code!=='ENOENT')throw e}
const recipe=resolve(root,'recipes/consumer'),baseline='389155313ee5b95f4125e64b61077ddf4257e3d6',sha=bytes=>createHash('sha256').update(bytes).digest('hex')
await mkdir(target,{recursive:true});await cp(resolve(recipe,'files'),target,{recursive:true})
for(const name of ['main','plugins']){const bytes=await readFile(resolve(target,`${name}.go.tmpl`));await writeFile(resolve(target,`${name}.go`),bytes)}
const {unlink}=await import('node:fs/promises');for(const name of ['main','plugins'])await unlink(resolve(target,`${name}.go.tmpl`))
await mkdir(resolve(target,'frontend/dist'));await writeFile(resolve(target,'frontend/dist/.keep'),'')
await writeFile(resolve(target,'go.mod'),'module example.com/chimera-recipe\n\ngo 1.26.6\n\nrequire github.com/hollis-labs/chimera v0.0.0-20261008115211-389155313ee5\n')
await writeFile(resolve(target,'LICENSE'),execFileSync('git',['show',`${baseline}:LICENSE`],{cwd:root}))
await mkdir(resolve(target,'frontend/public'),{recursive:true});await cp(resolve(target,'LICENSE'),resolve(target,'frontend/public/LICENSE-Chimera.txt'))
const provenance={schema:'chimera-consumer-recipe/v1',variant,baseline,go:'v0.0.0-20261008115211-389155313ee5',adapters:[],archives:[],policy:variant==='plugin'?'explicit reviewed main-origin fixture; no effects':'shell-only; no plugin frontend dependency'}
const lock=JSON.parse(execFileSync('git',['show',`${baseline}:frontend/package-lock.json`],{cwd:root})),dependencies={react:'19.3.0','react-dom':'19.3.0','@hollis-labs/design-components':'0.4.0','@hollis-labs/design-tokens':'0.4.0','@hollis-labs/design-app-runtime':'0.4.0'},devDependencies={typescript:'5.9.3',vite:'7.3.6',tailwindcss:'4.3.3','@tailwindcss/vite':'4.3.3','@types/node':'26.6.4','@types/react':'19.3.0','@types/react-dom':'19.3.0'}
if(variant==='plugin'){
 Object.assign(dependencies,{'@hollis-labs/plugin-registry':'0.2.0','@hollis-labs/plugin-host-ui':'file:../third_party/hollis-labs-plugin-host-ui-0.1.0.tgz','@hollis-labs/kit-settings':'0.2.0','es-module-lexer':'1.7.0'})
 for(const [from,to] of [['plugins.go.tmpl','plugins.go'],['Plugin.tsx','frontend/src/Plugin.tsx'],['vite.config.ts','frontend/vite.config.ts'],['plugin-bundle.js','frontend/src/plugin-bundle.js'],['plugin-style.css','frontend/src/plugin-style.css']])await cp(resolve(recipe,'plugin',from),resolve(target,to))
 await mkdir(resolve(target,'frontend/src/vendor/chimera'),{recursive:true})
 for(const file of ['composition.ts','runtime.ts','store.ts','stylesheets.ts']){const original=`frontend/src/${file}`,bytes=execFileSync('git',['show',`${baseline}:${original}`],{cwd:root});await writeFile(resolve(target,'frontend/src/vendor/chimera',file),bytes);provenance.adapters.push({original,local:`frontend/src/vendor/chimera/${file}`,sha256:sha(bytes)})}
 const license=execFileSync('git',['show',`${baseline}:LICENSE`],{cwd:root});await writeFile(resolve(target,'frontend/src/vendor/chimera/LICENSE'),license)
 const archive='hollis-labs-plugin-host-ui-0.1.0.tgz',bytes=execFileSync('git',['show',`${baseline}:third_party/${archive}`],{cwd:root});if(sha(bytes)!=='360c4bd74df7369d57af74151bba0ff0739b31b5c67499f1c01c15cefb4b24b0')throw Error('Candidate digest mismatch')
 await mkdir(resolve(target,'third_party'));await writeFile(resolve(target,'third_party',archive),bytes);await writeFile(resolve(target,'third_party/README.md'),`Only ${archive} is carried here. Unpublished MIT host-ui candidate from design-kit dbcf4fa7f5bcfe83686d227b39ddf9426cea4fe5; exact archive SHA256 ${sha(bytes)}. Runtime/CSS source unchanged; standalone tsconfig build adaptation. Complete MIT terms inside archive and public LICENSE-plugin-host-ui.txt. Original provenance: Chimera ${baseline}/third_party/README.md. No npm release, other private kits or publication claimed.\n`);provenance.archives.push({path:`third_party/${archive}`,sha256:sha(bytes),source:'design-kit dbcf4fa7f5bcfe83686d227b39ddf9426cea4fe5',license:'MIT (complete inside archive)'})
 const tar=gunzipSync(bytes);let candidateLicense
 for(let offset=0;offset+512<=tar.length;){const header=tar.subarray(offset,offset+512),name=header.subarray(0,100).toString().replace(/\0.*$/s,''),size=parseInt(header.subarray(124,136).toString().replace(/\0.*$/s,'').trim()||'0',8);if(name==='package/LICENSE')candidateLicense=tar.subarray(offset+512,offset+512+size);offset+=512+Math.ceil(size/512)*512}
 if(!candidateLicense)throw Error('Candidate MIT license missing');await writeFile(resolve(target,'frontend/public/LICENSE-plugin-host-ui.txt'),candidateLicense)
 await writeFile(resolve(target,'frontend/src/virtual.d.ts'),`declare module 'virtual:plugin-host-ui/stylesheets' { export function createStylesheetLeases(document:Document):import('@hollis-labs/plugin-host-ui/vite').StylesheetLeases }\n`)
 const css=resolve(target,'frontend/src/style.css');await writeFile(css,(await readFile(css,'utf8')).replace('@source',`@import '@hollis-labs/plugin-host-ui/source.css';\n@source`))
}
// Retain the exact already-reviewed lock entries, following declared dependency/peer
// closure. This prunes optional families without resolving any package upgrades.
const packages={'':{name:'chimera-recipe-frontend',version:'0.1.0',dependencies,devDependencies}},pending=Object.keys({...dependencies,...devDependencies}).map(name=>'node_modules/'+name)
function dependencyPath(parent,name){let path=parent;while(path){const candidate=path+'/node_modules/'+name;if(lock.packages[candidate])return candidate;const last=path.lastIndexOf('/node_modules/');path=last<0?'':path.slice(0,last)}return 'node_modules/'+name}
while(pending.length){const path=pending.pop();if(packages[path])continue;const entry=lock.packages[path];if(!entry)throw Error('Missing reviewed lock entry '+path);packages[path]=entry;for(const name of Object.keys({...entry.dependencies,...entry.optionalDependencies,...entry.peerDependencies})){const child=dependencyPath(path,name);if(lock.packages[child])pending.push(child);else if(!entry.peerDependenciesMeta?.[name]?.optional&&!entry.optionalDependencies?.[name]&&!entry.bundleDependencies?.includes(name))throw Error('Missing reviewed transitive '+name)}}
const pkg={name:'chimera-recipe-frontend',version:'0.1.0',private:true,type:'module',scripts:{typecheck:'tsc --noEmit',build:'vite build'},dependencies,devDependencies}
await writeFile(resolve(target,'frontend/package.json'),JSON.stringify(pkg,null,2)+'\n');await writeFile(resolve(target,'frontend/package-lock.json'),JSON.stringify({name:pkg.name,version:pkg.version,lockfileVersion:3,requires:true,packages},null,2)+'\n')
provenance.lockSource='frontend/package-lock.json at accepted runtime baseline (selected entries byte-value preserved)';provenance.npmPackages=Object.keys(packages).length-1;await writeFile(resolve(target,'recipe-provenance.json'),JSON.stringify(provenance,null,2)+'\n')
console.log(target)
