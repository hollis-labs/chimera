import { test, expect, type Page } from '@playwright/test';
async function seek(page: Page, index: number) {
    const slider = page.getByRole('slider', { name: 'Playback boundary' });
    await slider.focus();
    await page.keyboard.press('Home');
    for (let i = 0; i < index; i++)
        await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('status', { name: 'Playback clock' })).toContainText(`Frame ${index}/3`);
}
async function pending(page: Page) { const clock = await page.getByRole('status', { name: 'Playback clock' }).textContent(), index = clock!.match(/Frame (\d)\/3/)![1], cutoff = clock!.split('; ')[1]; await page.getByRole('button', { name: 'Prepare held playback producer' }).click(); await expect(page.getByRole('region', { name: 'Playback receipts' })).toContainText('pending'); await expect(page.getByRole('status', { name: 'Validated playback invocation' })).toContainText(`frame ${index}; ${cutoff}`); await expect(page.getByRole('region', { name: 'Playback plugin presentation' })).toContainText(`frame ${index};`); }
async function empty(page: Page) { await expect(page.getByRole('status', { name: 'Validated playback invocation' })).toHaveText('No current validated action'); await expect(page.getByRole('region', { name: 'Playback receipts' })).toBeEmpty(); await expect(page.getByRole('region', { name: 'Playback plugin presentation' }).locator('output[aria-label="Playback dispatch outcome"]')).toHaveText(''); }
test.beforeEach(async ({ page }) => { await page.goto('/?playback=1'); await expect(page.getByRole('heading', { name: 'Controlled deterministic playback proof' })).toBeVisible(); await expect(page.getByRole('button', { name: 'Stable local count 0' })).toBeVisible(); });
test('manual play/pause/seek/end/reset use exact authored boundaries and hide future rows/props', async ({ page }) => {
    await expect(page.getByRole('region', { name: 'Visible playback records' })).toContainText('source-a: queued');
    await expect(page.getByRole('region', { name: 'Visible playback records' })).not.toContainText('started');
    await expect(page.getByText(/final fixture outcome/)).toHaveCount(0);
    await page.getByRole('button', { name: 'Play fixture', exact: true }).click();
    await page.getByRole('button', { name: 'Advance fixture clock' }).click();
    await expect(page.getByRole('status', { name: 'Playback clock' })).toContainText('2026-10-05T12:00:01.200Z; playing');
    await expect(page.getByRole('region', { name: 'Playback plugin presentation' })).toContainText('playback-context-a/source-a: frame 1; source-a: started');
    await page.getByRole('button', { name: 'Pause fixture' }).click();
    await expect(page.getByRole('button', { name: 'Advance fixture clock' })).toBeDisabled();
    await page.getByRole('button', { name: 'Stable local count 0' }).click();
    await seek(page, 2);
    await expect(page.getByRole('button', { name: 'Stable local count 0' })).toBeVisible();
    await pending(page);
    await page.screenshot({ path: '../.scratch/controlled-playback-desktop.png' });
    await seek(page, 3);
    await expect(page.getByRole('status', { name: 'Playback clock' })).toContainText('2026-10-05T12:00:06.000Z; ended');
    await expect(page.getByRole('region', { name: 'Visible playback records' })).toContainText('Recorded outcome: final fixture outcome');
    await expect(page.getByRole('button', { name: 'Play fixture', exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'Reset playback' }).click();
    await expect(page.getByRole('status', { name: 'Playback clock' })).toContainText('2026-10-05T12:00:00.000Z; paused');
    await expect(page.getByText(/final fixture outcome/)).toHaveCount(0);
});
for (const change of ['seek', 'pause', 'reset', 'source', 'end'])
    test(`held actual plugin producer cannot commit across playback ${change}`, async ({ page }) => {
        await seek(page, 2);
        if (change === 'pause' || change === 'end')
            await page.getByRole('button', { name: 'Play fixture', exact: true }).click();
        await pending(page);
        if (change === 'seek')
            await seek(page, 0);
        else if (change === 'pause')
            await page.getByRole('button', { name: 'Pause fixture' }).click();
        else if (change === 'reset')
            await page.getByRole('button', { name: 'Reset playback' }).click();
        else if (change === 'end')
            await page.getByRole('button', { name: 'Advance fixture clock' }).click();
        else
            await page.getByRole('button', { name: 'Retire playback source' }).click();
        await empty(page);
        await page.getByRole('button', { name: 'Release playback producer', exact: true }).click();
        await empty(page);
        if (change !== 'end')
            await expect(page.getByText(/final fixture outcome/)).toHaveCount(0);
        else {
            await expect(page.getByRole('status', { name: 'Playback clock' })).toContainText('ended');
            await expect(page.getByRole('button', { name: 'Advance fixture clock' })).toBeDisabled();
        }
        if (change === 'source') {
            await expect(page.getByRole('region', { name: 'Playback plugin presentation' })).toContainText('playback-context-a/source-1: frame 0');
            await expect(page.getByRole('region', { name: 'Visible playback records' })).not.toContainText('source-a');
        }
        ;
        await pending(page);
        await page.getByRole('button', { name: 'Release playback producer', exact: true }).click();
        await expect(page.getByRole('region', { name: 'Playback receipts' })).toContainText('simulated success');
    });
test('context replacement retires old leases and producer while cutoff changes retain registry/style lease', async ({ page }) => {
    await page.locator('link[href$="/plugins/fake-ops/g1/style.css"]').evaluate(element => Reflect.set(globalThis, 'playbackLease', element));
    await seek(page, 2);
    expect(await page.evaluate(() => Reflect.get(globalThis, 'playbackLease').isConnected)).toBe(true);
    await pending(page);
    await page.getByRole('button', { name: 'Switch playback context' }).click();
    await expect(page.getByRole('region', { name: 'Playback plugin presentation' })).toContainText('playback-context-2/source-a: frame 0');
    await expect(page.getByRole('button', { name: 'Stable local count 0' })).toBeVisible();
    await page.getByRole('button', { name: 'Release retired playback producer' }).click();
    await empty(page);
    expect(await page.evaluate(() => Reflect.get(globalThis, 'playbackLease').isConnected)).toBe(false);
    await expect(page.locator('link[href$="/plugins/fake-ops/g1/style.css"]')).toHaveCount(1);
    await expect(page.getByText(/final fixture outcome/)).toHaveCount(0);
});
test('owner withdrawal cancels actual held source and leaves sibling/embedded cutoff evidence', async ({ page }) => { await seek(page, 1); await pending(page); await page.getByRole('button', { name: 'Unload playback plugin owner' }).click(); await expect(page.getByRole('region', { name: 'Playback receipts' })).toContainText('cancelled'); await page.getByRole('button', { name: 'Release playback producer', exact: true }).click(); await expect(page.getByRole('region', { name: 'Playback receipts' })).not.toContainText('simulated'); await expect(page.getByRole('button', { name: 'Stable local count 0' })).toBeVisible(); await expect(page.getByRole('region', { name: 'Visible playback records' })).toContainText('source-a: started'); await expect(page.locator('link[href$="/plugins/fake-ops/g1/style.css"]')).toHaveCount(0); });
test('unmount during playing/held producer removes surfaces and leases without late outcome', async ({ page }) => { await page.getByRole('button', { name: 'Play fixture', exact: true }).click(); await page.getByRole('button', { name: 'Advance fixture clock' }).click(); await pending(page); const hostStyles = await page.locator('link[href*="/assets/"]').count(); await page.getByRole('button', { name: 'Unmount playback consumer' }).click(); await expect(page.getByRole('heading', { name: 'Playback consumer retired' })).toBeVisible(); await expect(page.getByRole('region', { name: 'Playback plugin presentation' })).toHaveCount(0); await expect(page.locator('link[href$="/plugins/fake-ops/g1/style.css"]')).toHaveCount(0); await page.getByRole('button', { name: 'Release retired playback producer' }).click(); await expect(page.getByText(/Fixture receipt|final fixture outcome/)).toHaveCount(0); expect(await page.locator('link[href*="/assets/"]').count()).toBe(hostStyles); await expect(page.getByRole('button', { name: 'Advance fixture clock' })).toHaveCount(0); });
test('narrow keyboard clock controls stay local, readable and paused after seek', async ({ page }) => {
    const external: string[] = [], writes: string[] = [];
    page.on('request', request => {
        if (!request.url().startsWith('http://127.0.0.1:18543/'))
            external.push(request.url());
        if (!['GET', 'HEAD'].includes(request.method()))
            writes.push(request.method());
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await seek(page, 1);
    await expect(page.getByRole('status', { name: 'Playback clock' })).toContainText('paused');
    expect(await page.getByRole('slider', { name: 'Playback boundary' }).evaluate(element => getComputedStyle(element).outlineWidth)).toBe('2px');
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await expect(page.getByRole('region', { name: 'Playback plugin presentation' })).toContainText('frame 1; source-a: started');
    await expect(page.getByText(/final fixture outcome/)).toHaveCount(0);
    await pending(page);
    await page.getByRole('slider', { name: 'Playback boundary' }).focus();
    await page.screenshot({ path: '../.scratch/controlled-playback-narrow.png', fullPage: true });
    expect(external).toEqual([]);
    expect(writes).toEqual([]);
});
