import {defineConfig} from '@playwright/test'
export default defineConfig({testDir:'browser',outputDir:'../.scratch/browser-results',reporter:'list',use:{baseURL:'http://127.0.0.1:18443',headless:true},webServer:{command:'../.scratch/fake-controlplane -addr 127.0.0.1:18443',url:'http://127.0.0.1:18443/healthz',reuseExistingServer:false,timeout:10000}})
