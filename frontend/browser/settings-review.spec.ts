import { test, expect, type Page } from '@playwright/test';
async function held(page: Page) { await page.getByLabel('Review title (required)').fill('Local draft title'); await page.getByRole('button', { name: 'Next', exact: true }).click(); await page.getByRole('checkbox', { name: 'Review enabled' }).check(); await page.getByRole('button', { name: 'Next', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Review setup', exact: true })).toBeVisible(); await page.getByRole('button', { name: 'Submit setup', exact: true }).click(); await expect(page.getByRole('status', { name: 'Settings preview outcome' })).toContainText('Held local preview'); }
test.beforeEach(async ({ page }) => { await page.goto('/?settingsReview=1'); await expect(page.getByRole('heading', { name: 'Controlled settings review proof' })).toBeVisible(); await expect(page.getByRole('button', { name: 'Stable local count 0' })).toBeVisible(); });
test('four actual settings exports retain drafts and truthful zero/false/secret presence/provenance with optional effects omitted', async ({ page }) => { await page.getByRole('button', { name: 'Review group', exact: true }).click(); const title = page.getByLabel('Review title (required)'), count = page.getByLabel('Review count (required)'); await expect(count).toHaveValue('0'); expect(await count.getAttribute('type')).toBe('text'); expect(await count.getAttribute('required')).toBeNull(); expect(await count.locator('..').locator('input').getAttribute('aria-required')).toBe('true'); expect(await title.evaluate(el => (el.closest('form') as HTMLFormElement).noValidate)).toBe(true); await title.fill('a'); await expect(title).toHaveAttribute('aria-invalid', 'true'); await count.fill('6'); await expect(count).toHaveAttribute('aria-invalid', 'true'); await count.focus(); await page.keyboard.press('Enter'); await expect(page.getByRole('status', { name: 'Settings preview outcome' })).toHaveText('No local preview'); await title.fill('Local valid title'); await count.fill('0'); await page.keyboard.press('Enter'); await expect(page.getByRole('status', { name: 'Settings preview outcome' })).toHaveText('No local preview'); await expect(page.locator('input[type=password]')).toHaveCount(0); await expect(page.getByText('Secret is set', { exact: true })).toBeVisible(); await page.getByRole('button', { name: 'Review renderer', exact: true }).click(); await expect(title).toHaveValue('Local valid title'); await expect(page.getByRole('checkbox', { name: 'Review enabled' })).not.toBeChecked(); await expect(page.getByText('compact', { exact: true })).toBeVisible(); await page.getByRole('button', { name: 'Review provenance', exact: true }).click(); await expect(page.getByRole('region', { name: 'Controlled settings review' })).toContainText('Pending restart'); await expect(page.getByRole('button', { name: /Save changes|Validate changes|Reset override|Apply|Request connectivity check/ })).toHaveCount(0); await page.screenshot({ path: '../.scratch/controlled-settings-review-desktop.png', fullPage: true }); await page.locator('.settings-review-renderer').evaluate(el => el.scrollIntoView({ block: 'start' })); await page.screenshot({ path: '../.scratch/controlled-settings-review-desktop-viewport.png', fullPage: false }); });
test('wizard emits held local plan only and preserves drafts/values/restart metadata after release', async ({ page }) => { await held(page); await page.locator('.settings-review-renderer').evaluate(el => el.scrollIntoView({ block: 'start' })); await page.screenshot({ path: '../.scratch/controlled-settings-review-wizard.png', fullPage: false }); await expect(page.getByRole('button', { name: 'Back', exact: true })).toBeDisabled(); await page.getByRole('button', { name: 'Release settings preview producer', exact: true }).click(); await expect(page.getByRole('status', { name: 'Settings preview outcome' })).toContainText('Local plan preview only'); await expect(page.getByText(/Local preview display:/)).toContainText('Local draft title'); await expect(page.getByText(/Draft keys:/)).toContainText('display.title'); await page.getByRole('button', { name: 'Review provenance', exact: true }).click(); await expect(page.getByLabel('Review title (required)')).toHaveValue('Local draft title'); await expect(page.getByRole('region', { name: 'Controlled settings review' })).toContainText('Pending restart'); });
for (const change of ['generation', 'owner', 'source', 'context'])
    test(`actual ${change} retires held preview/drafts/step and preserves applicable stable owner`, async ({ page }) => {
        await page.getByRole('button', { name: 'Stable local count 0' }).click();
        await held(page);
        const old = await page.getByText(/Settings lease:/).textContent();
        await page.locator('link[href*="fake-ops/g1/style.css"]').evaluate(el => (window as any).settingsOldStyle = el);
        await page.getByRole('button', { name: change === 'generation' ? 'Replace settings generation' : change === 'owner' ? 'Unload playback plugin owner' : change === 'source' ? 'Retire playback source' : 'Switch playback context' }).click();
        await expect(page.getByText('Draft keys: none', { exact: true })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Controlled settings review proof' })).toBeFocused();
        if (change !== 'owner') {
            await expect(page.getByLabel('Review title (required)')).toHaveValue('Authored fixture');
            await expect(page.getByText('Step 1 of 3: Authored display settings', { exact: true })).toBeVisible();
        }
        if (change === 'generation')
            expect(await page.getByText(/Settings lease:/).textContent()).toBe(old!.replace(/\/g1$/, '/g2'));
        await page.getByRole('button', { name: change === 'context' ? 'Release retired settings producer' : 'Release settings preview producer', exact: true }).click();
        await expect(page.getByRole('status', { name: 'Settings preview outcome' })).toHaveText('No local preview');
        await expect(page.getByText(/Local preview display:/)).toHaveCount(0);
        expect(await page.evaluate(() => (window as any).settingsOldStyle.isConnected)).toBe(change === 'source');
        await expect(page.getByRole('button', { name: change === 'generation' || change === 'owner' ? 'Stable local count 1' : 'Stable local count 0' })).toBeVisible();
    });
test('narrow keyboard review, mode cancellation and unmount fence producer without external effects', async ({ page }) => {
    const effects: string[] = [];
    page.on('request', r => {
        if (!['127.0.0.1:18543', '127.0.0.1:18544'].includes(new URL(r.url()).host) || r.method() !== 'GET')
            effects.push(r.url());
    });
    await page.setViewportSize({ width: 390, height: 844 });
    const title = page.getByLabel('Review title (required)');
    await title.focus();
    await title.fill('Narrow review');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Remove override for Review title', exact: true })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Review count (required)')).toBeFocused();
    await page.getByRole('button', { name: 'Hold local draft preview', exact: true }).click();
    await page.getByRole('button', { name: 'Review group', exact: true }).click();
    await page.getByRole('button', { name: 'Release settings preview producer', exact: true }).click();
    await expect(page.getByRole('status', { name: 'Settings preview outcome' })).toHaveText('No local preview');
    await expect(title).toHaveValue('Narrow review');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= 390)).toBe(true);
    await page.locator('.settings-review-renderer').evaluate(el => el.scrollIntoView({ block: 'start' }));
    await page.screenshot({ path: '../.scratch/controlled-settings-review-narrow.png', fullPage: false });
    await page.getByRole('button', { name: 'Hold local draft preview', exact: true }).click();
    await page.getByRole('button', { name: 'Unmount playback consumer' }).click();
    await page.getByRole('button', { name: 'Release retired settings producer', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Controlled settings review' })).toHaveCount(0);
    await expect(page.locator('link[href*="/plugins/"]')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Playback consumer retired' })).toBeVisible();
    expect(effects).toEqual([]);
});
test('actual Remove override stages an inspectable unset plan and Undo restores untouched snapshot', async ({ page }) => { await page.getByRole('button', { name: 'Review provenance', exact: true }).click(); await page.getByRole('button', { name: 'Remove override for Review title', exact: true }).click(); await expect(page.getByLabel('Review title (required)')).toBeDisabled(); await expect(page.getByText('Override removal staged. The host will resolve and validate the fallback.', { exact: true })).toBeVisible(); await page.getByRole('button', { name: 'Hold local draft preview', exact: true }).click(); await page.getByRole('button', { name: 'Release settings preview producer', exact: true }).click(); await expect(page.getByText(/Local preview display:/)).toContainText('\"unset\":[\"title\"]'); await expect(page.getByRole('region', { name: 'Controlled settings review' })).toContainText('Pending restart'); await page.getByRole('button', { name: 'Undo removal of Review title', exact: true }).click(); await expect(page.getByLabel('Review title (required)')).toHaveValue('Authored fixture'); await expect(page.getByText('Draft keys: none', { exact: true })).toBeVisible(); await expect(page.getByRole('status', { name: 'Settings preview outcome' })).toHaveText('No local preview'); });
