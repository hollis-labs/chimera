import { test, expect, type Page } from '@playwright/test';
async function open(page: Page) { await page.getByRole('button', { name: 'Open local draft' }).click(); const dialog = page.getByRole('dialog', { name: 'Review local draft' }); await expect(dialog).toBeVisible(); await expect.poll(() => dialog.evaluate(el => el.contains(document.activeElement))).toBe(true); return dialog; }
async function draft(page: Page) { const dialog = await open(page); await dialog.getByRole('textbox', { name: 'Draft label' }).fill('Review fixture'); return dialog; }
async function menu(page: Page, label: string) { await page.getByRole('button', { name: 'Draft review actions' }).focus(); await page.keyboard.press('ArrowDown'); await expect(page.getByRole('menu')).toBeVisible(); await expect(page.getByRole('menuitem', { name: 'Business save unavailable' })).toHaveAttribute('aria-disabled', 'true'); if (label === 'Discard local draft')
    await page.keyboard.press('ArrowDown'); await expect(page.getByRole('menuitem', { name: label, exact: true })).toBeFocused(); await page.keyboard.press('Enter'); }
test.beforeEach(async ({ page }) => { await page.goto('/?overlays=1'); await expect(page.getByRole('heading', { name: 'Controlled overlay retirement proof' })).toBeVisible(); await expect(page.getByRole('button', { name: 'Stable local count 0' })).toBeVisible(); });
test('actual form focus containment, Escape/direct trigger and menu origin restoration', async ({ page }) => {
    const dialog = await open(page);
    for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
        await expect.poll(() => dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Open local draft' })).toBeFocused();
    await menu(page, 'Edit local draft');
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Draft review actions' })).toBeFocused();
});
test('native Enter/submit guard, held rejection and success preserve local draft', async ({ page }) => {
    const dialog = await open(page);
    const input = dialog.getByRole('textbox', { name: 'Draft label' });
    await input.press('Enter');
    await expect(page.getByText('Held overlay producers: 0')).toBeVisible();
    await input.fill('Review fixture');
    await input.press('Enter');
    await expect(dialog.getByRole('button', { name: 'Prepare local preview' })).toBeDisabled();
    await input.evaluate(el => el.closest('form')!.requestSubmit());
    await expect(page.getByText('Held overlay producers: 1')).toBeVisible();
    await dialog.getByRole('button', { name: 'Release rejected preview' }).click();
    await expect(dialog.getByRole('status')).toHaveText('Preview rejected; draft retained');
    await expect(input).toHaveValue('Review fixture');
    await dialog.getByRole('button', { name: 'Prepare local preview' }).click();
    await dialog.getByRole('button', { name: 'Release accepted preview' }).click();
    await expect(dialog.getByRole('status')).toHaveText('Local preview: Review fixture');
    await expect(input).toHaveValue('Review fixture');
    await page.screenshot({ path: '../.scratch/controlled-overlays-desktop.png', fullPage: false });
});
test('busy form and confirmation Escape cancel held outcomes and restore their surviving origin', async ({ page }) => {
    const dialog = await draft(page);
    await dialog.getByRole('button', { name: 'Prepare local preview' }).click();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await page.getByRole('button', { name: 'Release retired overlay producer' }).click();
    await expect(page.getByRole('status', { name: 'Overlay outcome' })).toHaveText('No local preview');
    await menu(page, 'Discard local draft');
    const confirm = page.getByRole('dialog', { name: 'Discard local draft?' });
    await expect(confirm).toBeVisible();
    await confirm.getByRole('button', { name: 'Discard transient draft' }).click();
    await expect(confirm.getByRole('button', { name: 'Discard transient draft' })).toBeDisabled();
    await page.keyboard.press('Escape');
    await expect(confirm).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Draft review actions' })).toBeFocused();
    await page.getByRole('button', { name: 'Release retired overlay producer' }).click();
    await expect(page.getByText('Local draft: Review fixture')).toBeVisible();
    await menu(page, 'Discard local draft');
    await confirm.getByRole('button', { name: 'Discard transient draft' }).click();
    await confirm.getByRole('button', { name: 'Release local discard' }).click();
    await expect(confirm).toHaveCount(0);
    await expect(page.getByText('Local draft: empty')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Draft review actions' })).toBeFocused();
});
for (const change of ['source', 'owner', 'generation', 'context'])
    test(`held overlay retires through actual ${change} lifecycle and focuses current host heading`, async ({ page }) => {
        await page.getByRole('button', { name: 'Stable local count 0' }).click();
        const dialog = await draft(page);
        await dialog.getByRole('button', { name: 'Prepare local preview' }).click();
        const oldLease=await page.getByText(/Overlay lease:/).textContent();
        const oldStyle = page.locator('link[href*="fake-ops/g1/style.css"]');
        await oldStyle.evaluate(el => (window as unknown as {
            oldOverlayStyle: Element;
        }).oldOverlayStyle = el);
        await dialog.getByRole('button', { name: change === 'source' ? 'Retire source from form' : change === 'owner' ? 'Withdraw plugin from form' : change === 'generation' ? 'Replace owner generation from form' : 'Replace context from form' }).click();
        await expect(dialog).toHaveCount(0);
        await expect(page.getByRole('heading', { name: 'Controlled overlay retirement proof' })).toBeFocused();
        await expect(page.getByText('Local draft: empty')).toBeVisible();
        await page.getByRole('button', { name: 'Release retired overlay producer' }).click();
        await expect(page.getByRole('status', { name: 'Overlay outcome' })).toHaveText('No local preview');
        if (change === 'owner') {
            await expect(page.getByRole('button', { name: 'Open local draft' })).toBeDisabled();
            await expect(page.getByRole('button', { name: 'Draft review actions' })).toHaveCount(0);
        }
        if (change === 'generation') {
            await expect(page.getByText(/Overlay lease:.*g2/)).toBeVisible();
            expect(await page.getByText(/Overlay lease:/).textContent()).toBe(oldLease!.replace(/\/g1$/,'/g2'));
            await expect(page.locator('link[href*="fake-ops/g2/style.css"]')).toHaveCount(1);
        }
        if (change === 'source') {
            expect(await page.evaluate(() => (window as unknown as {
                oldOverlayStyle: Element;
            }).oldOverlayStyle.isConnected)).toBe(true);
        }
        else {
            expect(await page.evaluate(() => (window as unknown as {
                oldOverlayStyle: Element;
            }).oldOverlayStyle.isConnected)).toBe(false);
        }
        await expect(page.getByRole('button', { name: change === 'source' || change === 'context' ? 'Stable local count 0' : 'Stable local count 1' })).toBeVisible();
    });
test('narrow actual input/textarea and menu/dialog controls stay readable with no effects', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const dialog = await draft(page);
    await dialog.getByRole('textbox', { name: 'Review note' }).fill('Authored review only.');
    const box = await dialog.boundingBox();
    expect(box!.width).toBeLessThanOrEqual(358);
    expect(box!.x).toBeGreaterThanOrEqual(16);
    expect(box!.y).toBeGreaterThanOrEqual(16);
    expect(box!.x + box!.width).toBeLessThanOrEqual(374);
    expect(box!.y + box!.height).toBeLessThanOrEqual(828);
    expect(box!.height).toBeLessThanOrEqual(812);
    expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    const color = await dialog.getByRole('textbox', { name: 'Draft label' }).evaluate(el => ({ foreground: getComputedStyle(el).color, body: getComputedStyle(document.body).color, border: getComputedStyle(el).borderTopWidth }));
    expect(color.foreground).toBe(color.body);
    expect(color.border).toBe('1px');
    const effects: string[] = [];
    page.on('request', request => {
        if (request.method() !== 'GET' || new URL(request.url()).origin !== 'http://127.0.0.1:18543')
            effects.push(request.url());
    });
    await dialog.getByRole('button', { name: 'Prepare local preview' }).click();
    await dialog.getByRole('button', { name: 'Release rejected preview' }).click();
    const body = dialog.locator('form > div').nth(1);
    await expect(body).toHaveCSS('overflow-y', 'auto');
    await dialog.getByRole('button', { name: 'Replace context from form' }).focus();
    await expect.poll(() => dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
    expect(await body.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
    await expect(dialog.getByRole('button', { name: 'Prepare local preview' })).toBeVisible();
    await dialog.getByRole('textbox', { name: 'Draft label' }).focus();
    await body.evaluate(el => el.scrollTop = 0);
    await expect(dialog.getByRole('textbox', { name: 'Draft label' })).toBeVisible();
    await page.screenshot({ path: '../.scratch/controlled-overlays-narrow.png', fullPage: false });
    expect(effects).toEqual([]);
});
test('consumer unmount releases style and retired producer cannot recreate dialog or steal focus', async ({ page }) => { const dialog = await draft(page); await dialog.getByRole('button', { name: 'Prepare local preview' }).click(); await dialog.getByRole('button', { name: 'Unmount consumer from form' }).click(); await expect(page.getByRole('heading', { name: 'Playback consumer retired' })).toBeFocused(); await expect(dialog).toHaveCount(0); await expect(page.locator('link[href*="fake-ops"]')).toHaveCount(0); await page.getByRole('button', { name: 'Release retired overlay producer' }).click(); await expect(dialog).toHaveCount(0); await expect(page.getByRole('region', { name: 'Controlled overlay drafts' })).toHaveCount(0); await expect(page.getByRole('button', { name: 'Release retired overlay producer' })).toBeFocused(); });
