import { test, expect, type Page } from '@playwright/test';
async function seek(page: Page, index: number) {
    const slider = page.getByRole('slider', { name: 'Playback boundary' });
    await slider.focus();
    await page.keyboard.press('Home');
    for (let i = 0; i < index; i++)
        await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('status', { name: 'Playback clock' })).toContainText(`Frame ${index}/3`);
}
async function select(page: Page) { await seek(page, 2); const search = page.getByRole('searchbox', { name: 'Search recorded evidence' }); await search.fill('queued'); await expect(page.getByRole('region', { name: 'Filtered evidence records' }).getByRole('button')).toHaveCount(1); await page.getByRole('button', { name: 'Select source-a: queued' }).click(); await page.getByRole('button', { name: 'Inspect selected JSON' }).click(); const dialog = page.getByRole('dialog', { name: 'Recorded JSON inspection' }); await expect(dialog).toBeVisible(); return dialog; }
test.beforeEach(async ({ page }) => { await page.goto('/?inspector=1'); await expect(page.getByRole('heading', { name: 'Controlled payload inspector proof' })).toBeVisible(); await expect(page.getByRole('button', { name: 'Stable local count 0' })).toBeVisible(); });
test('published summary/metadata/JSON preserve zero/null and malformed literal diagnostics without future records', async ({ page }) => { await seek(page, 2); const records = page.getByRole('region', { name: 'Filtered evidence records' }); await expect(records.getByRole('button')).toHaveCount(3); await expect(records).not.toContainText('final fixture outcome'); await page.getByRole('button', { name: 'Select source-a: queued' }).click(); const detail = page.getByRole('region', { name: 'Selected evidence detail' }); await expect(detail.locator('pre')).toContainText('"errors": 0'); await expect(detail.locator('pre')).toContainText('"spend": null'); await expect(detail).toContainText('2026-10-05T12:00:03.100Z'); await page.getByRole('button', { name: 'Select source-a: started' }).click(); await expect(detail).toContainText('malformed raw fixture'); await expect(detail.locator('pre')).toContainText('[{fixture truncated'); await page.getByRole('button', { name: 'Select source-a: queued' }).click(); await page.screenshot({ path: '../.scratch/controlled-inspector-desktop.png', fullPage: true }); });
test('search slash/Escape and modal keyboard focus stay within current inspector with no effectful exports', async ({ page }) => {
    await seek(page, 2);
    await page.getByRole('heading', { name: 'Controlled payload inspector proof' }).focus();
    await page.keyboard.press('/');
    await expect(page.getByRole('searchbox')).toBeFocused();
    await page.getByRole('searchbox').fill('missing');
    await expect(page.getByRole('region', { name: 'Filtered evidence records' }).getByRole('button')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('searchbox')).toHaveValue('');
    await expect(page.getByRole('region', { name: 'Filtered evidence records' }).getByRole('button')).toHaveCount(3);
    await page.getByRole('button', { name: 'Select source-a: queued' }).click();
    await page.getByRole('button', { name: 'Inspect selected JSON' }).click();
    const dialog = page.getByRole('dialog', { name: 'Recorded JSON inspection' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Close inspection' }).focus();
    const desktopBounds = await dialog.boundingBox();
    expect(desktopBounds!.x).toBeGreaterThanOrEqual(16);
    expect(desktopBounds!.y).toBeGreaterThanOrEqual(16);
    expect(desktopBounds!.x + desktopBounds!.width).toBeLessThanOrEqual(1264);
    expect(desktopBounds!.y + desktopBounds!.height).toBeLessThanOrEqual(704);
    await page.screenshot({ path: '../.scratch/controlled-inspector-desktop-modal.png', fullPage: false });
    await page.keyboard.press('/');
    await expect(dialog.getByRole('button', { name: 'Close inspection' })).toBeFocused();
    for (let index = 0; index < 8; index++) {
        await page.keyboard.press('Tab');
        await expect.poll(() => dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
    }
    await expect(page.getByRole('button', { name: /copy|download/i })).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Inspect selected JSON' })).toBeFocused();
});
for (const change of ['source', 'generation', 'owner', 'context'])
    test(`actual ${change} retirement closes JSON and clears search/selection without stale focus or styles`, async ({ page }) => {
        await seek(page, 2);
        await page.getByRole('button', { name: 'Stable local count 0' }).click();
        await page.getByRole('searchbox').fill('queued');
        await expect(page.getByRole('region', { name: 'Filtered evidence records' }).getByRole('button')).toHaveCount(1);
        await page.getByRole('button', { name: 'Select source-a: queued' }).click();
        const oldLease = await page.getByText(/Inspector lease:/).textContent();
        await page.getByRole('button', { name: 'Inspect selected JSON' }).click();
        const dialog = page.getByRole('dialog', { name: 'Recorded JSON inspection' });
        await page.locator('link[href*="fake-ops/g1/style.css"]').evaluate(el => (window as unknown as {
            inspectorStyle: Element;
        }).inspectorStyle = el);
        await dialog.getByRole('button', { name: change === 'source' ? 'Retire inspector source' : change === 'generation' ? 'Replace inspector generation' : change === 'owner' ? 'Withdraw inspector owner' : 'Replace inspector context' }).click();
        await expect(dialog).toHaveCount(0);
        await expect(page.getByRole('status', { name: 'Inspector selection' })).toHaveText('No selected payload');
        await expect(page.getByRole('heading', { name: 'Controlled payload inspector proof' })).toBeFocused();
        if (change === 'owner') {
            await expect(page.getByRole('searchbox')).toHaveCount(0);
            await expect(page.getByRole('region', { name: 'Filtered evidence records' })).toContainText('No current matching evidence');
        }
        else
            await expect(page.getByRole('searchbox')).toHaveValue('');
        if (change === 'generation') {
            expect(await page.getByText(/Inspector lease:/).textContent()).toBe(oldLease!.replace(/\/g1$/, '/g2'));
            await expect(page.locator('link[href*="fake-ops/g2/style.css"]')).toHaveCount(1);
        }
        expect(await page.evaluate(() => (window as unknown as {
            inspectorStyle: Element;
        }).inspectorStyle.isConnected)).toBe(change === 'source');
        await expect(page.getByRole('button', { name: change === 'owner' || change === 'generation' ? 'Stable local count 1' : 'Stable local count 0' })).toBeVisible();
    });
test('pending debounce cannot populate replacement source; unmount clears modal with no later focus steal', async ({ page }) => { await seek(page, 2); await page.getByRole('searchbox').fill('queued'); await page.getByRole('button', { name: 'Retire playback source' }).click(); await expect(page.getByRole('searchbox')).toHaveValue(''); await expect(page.getByRole('status', { name: 'Inspector selection' })).toHaveText('No selected payload'); await page.getByRole('button', { name: 'Select source-1: queued' }).click(); await page.getByRole('button', { name: 'Inspect selected JSON' }).click(); await page.getByRole('dialog').getByRole('button', { name: 'Unmount inspector consumer' }).click(); await expect(page.getByRole('heading', { name: 'Playback consumer retired' })).toBeFocused(); await expect(page.getByRole('dialog')).toHaveCount(0); await expect(page.getByRole('searchbox')).toHaveCount(0); await expect(page.locator('link[href*="fake-ops"]')).toHaveCount(0); await page.getByRole('button', { name: 'Release retired playback producer' }).focus(); await expect(page.getByRole('button', { name: 'Release retired playback producer' })).toBeFocused(); });
test('narrow actual payload/detail/modal bounds and native focus remain readable with no external effects', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const dialog = await select(page);
    await expect.poll(() => dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
    const bounds = await dialog.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(16);
    expect(bounds!.y).toBeGreaterThanOrEqual(16);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(374);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(828);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(dialog.locator('pre')).toContainText('"spend": null');
    const body = dialog.locator(':scope > .overflow-y-auto');
    await expect(body).toHaveCSS('overflow-y', 'auto');
    await dialog.getByRole('button', { name: 'Unmount inspector consumer' }).focus();
    await expect.poll(() => dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
    expect(await body.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
    await body.evaluate(el => el.scrollTop = 0);
    const json = dialog.locator('pre');
    await expect(json).toHaveCSS('overflow-x', 'auto');
    const seam = await json.evaluate(el => { el.scrollLeft = el.scrollWidth; return { left: el.scrollLeft, width: el.scrollWidth, client: el.clientWidth }; });
    expect(seam.left).toBeGreaterThan(0);
    expect(Math.abs(seam.left - (seam.width - seam.client))).toBeLessThan(1);
    await expect(json).toContainText('2026-10-05T12:00:00.000Z');
    await json.evaluate(el => el.scrollLeft = 0);
    const effects: string[] = [];
    page.on('request', request => {
        if (request.method() !== 'GET' || new URL(request.url()).origin !== 'http://127.0.0.1:18543')
            effects.push(request.url());
    });
    await dialog.getByRole('button', { name: 'Close inspection' }).focus();
    await page.screenshot({ path: '../.scratch/controlled-inspector-narrow.png', fullPage: false });
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Inspect selected JSON' })).toBeFocused();
    expect(effects).toEqual([]);
});
test('same-frame close and immediate reopen cancels old origin focus while fresh modal stays active', async ({ page }) => { const dialog = await select(page); await dialog.getByRole('button', { name: 'Close inspection' }).focus(); await page.evaluate(async () => { const buttons = () => Array.from(document.querySelectorAll('button')); buttons().find(button => button.textContent === 'Close inspection')!.click(); await Promise.resolve(); buttons().find(button => button.textContent === 'Inspect selected JSON')!.click(); }); await expect(dialog).toBeVisible(); await expect.poll(() => dialog.evaluate(el => el.contains(document.activeElement))).toBe(true); await page.keyboard.press('Tab'); await expect.poll(() => dialog.evaluate(el => el.contains(document.activeElement))).toBe(true); await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0); await expect(page.getByRole('button', { name: 'Inspect selected JSON' })).toBeFocused(); });
