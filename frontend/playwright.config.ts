import {defineConfig} from '@playwright/test'
import {mkdirSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
process.env.TMPDIR=fileURLToPath(new URL('../.scratch/tmp/',import.meta.url));mkdirSync(process.env.TMPDIR,{recursive:true})
export default defineConfig({testDir:'browser',outputDir:'../.scratch/browser-results',reporter:'list',use:{baseURL:'http://127.0.0.1:18543',headless:true},workers:1,webServer:[{command:'../.scratch/fake-controlplane -addr 127.0.0.1:18543',url:'http://127.0.0.1:18543/healthz',reuseExistingServer:false,timeout:10000},{command:'node node_modules/vite/bin/vite.js --config example/vite.config.ts --port 18544',url:'http://127.0.0.1:18544/proof/',env:{CHIMERA_EXAMPLE_BASE:'/proof/'},reuseExistingServer:false,timeout:10000}]})
