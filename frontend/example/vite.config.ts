import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { pluginHostImportmap } from '@hollis-labs/plugin-host-ui/vite'
import { fileURLToPath } from 'node:url'
export default defineConfig({base:process.env.CHIMERA_EXAMPLE_BASE??'/',server:{host:'127.0.0.1',proxy:{'/plugins':'http://127.0.0.1:18443'}},root:fileURLToPath(new URL('.',import.meta.url)),build:{outDir:fileURLToPath(new URL('../../examples/fake-controlplane/dist',import.meta.url)),emptyOutDir:false},esbuild:{jsx:'automatic'},plugins:[tailwindcss(),pluginHostImportmap({entries:[{specifier:'react',source:'react',exports:['createElement','useState','useSyncExternalStore','version'],defaultExport:true},{specifier:'@chimera/ui',source:'@hollis-labs/design-components',exports:['Button']},{specifier:'react/jsx-runtime',source:'react/jsx-runtime',exports:['Fragment','jsx','jsxs']} ]})]})
