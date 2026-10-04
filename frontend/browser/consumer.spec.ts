import {test,expect} from '@playwright/test'
test('isolated consumer renders real verified plugin widget/panel with shared React and unloads',async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message))
 await page.goto('/')
 await expect(page.getByRole('heading',{name:'Isolated fake control plane'})).toBeVisible()
 const widget=page.getByRole('button',{name:'Fixture provider: unavailable; local count 0'})
 await expect(widget).toBeVisible();expect(await widget.evaluate(element=>getComputedStyle(element).paddingTop)).not.toBe('0px');await expect(page.locator('link[href$="/plugins/fake-ops/g1/style.css"]')).toHaveCount(1);const hostStyles=await page.locator('link[href*="/assets/"]').count();await widget.click()
 await expect(page.getByRole('button',{name:'Fixture provider: unavailable; local count 1'})).toBeVisible()
 await expect(page.getByText('Owner: application; no live provider connected')).toBeVisible()
 const map=await page.locator('script[type="importmap"]').textContent();expect(JSON.parse(map!).imports.react).toContain('/assets/');expect(JSON.parse(map!).imports['@chimera/ui']).toContain('/assets/')
 await page.getByRole('button',{name:'Unload fixture owner'}).click()
 await expect(page.getByText('Owner: application; no live provider connected')).toHaveCount(0)
 await expect(page.getByRole('button',{name:/Fixture provider:/})).toHaveCount(0)
 await expect(page.locator('link[href$="/plugins/fake-ops/g1/style.css"]')).toHaveCount(0);expect(await page.locator('link[href*="/assets/"]').count()).toBe(hostStyles);expect(errors).toEqual([])
})

 test('development subpath provisions the same approved runtime and plugin hooks',async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message))
 await page.goto('http://127.0.0.1:18444/proof/')
 const widget=page.getByRole('button',{name:'Fixture provider: unavailable; local count 0'});await expect(widget).toBeVisible();await widget.click()
 await expect(page.getByRole('button',{name:'Fixture provider: unavailable; local count 1'})).toBeVisible()
 const raw=await page.locator('script[type="importmap"]').textContent();expect(JSON.parse(raw!).imports.react).toContain('/proof/');expect(JSON.parse(raw!).imports['@chimera/ui']).toContain('/proof/')
 expect(errors).toEqual([])
})
