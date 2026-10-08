import {defineConfig} from 'vite'
import tailwindcss from '@tailwindcss/vite'
import {pluginHostImportmap} from '@hollis-labs/plugin-host-ui/vite'
export default defineConfig({base:process.env.RECIPE_BASE??'/',plugins:[tailwindcss(),pluginHostImportmap({entries:[{specifier:'react',source:'react',exports:['createElement','useState','useSyncExternalStore','version'],defaultExport:true},{specifier:'@recipe/ui',source:'@hollis-labs/design-components',exports:['Button']},{specifier:'react/jsx-runtime',source:'react/jsx-runtime',exports:['Fragment','jsx','jsxs']}]})],esbuild:{jsx:'automatic'}})
