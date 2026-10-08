import {defineConfig} from 'vite'
import tailwindcss from '@tailwindcss/vite'
export default defineConfig({base:process.env.RECIPE_BASE??'/',plugins:[tailwindcss()],esbuild:{jsx:'automatic'}})
