import { defineConfig } from 'vite'
import { pluginHostImportmap } from '@hollis-labs/plugin-host-ui/vite'
import { fileURLToPath } from 'node:url'
export default defineConfig({root:fileURLToPath(new URL('.',import.meta.url)),build:{outDir:fileURLToPath(new URL('../../examples/fake-controlplane/dist',import.meta.url)),emptyOutDir:false},esbuild:{jsx:'automatic'},plugins:[pluginHostImportmap({entries:[{specifier:'react',source:'react',exports:['createElement','useState','useSyncExternalStore','version'],defaultExport:true},{specifier:'react/jsx-runtime',source:'react/jsx-runtime',exports:['Fragment','jsx','jsxs']} ]})]})
