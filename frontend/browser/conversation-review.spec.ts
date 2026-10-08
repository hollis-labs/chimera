import { test, expect, type Page } from '@playwright/test';
const outcome = (page: Page) => page.getByRole('status', { name: 'Conversation inspection outcome' });
const composer = (page: Page) => page.getByLabel('Local conversation draft', { exact: true });
async function held(page: Page) { await page.getByLabel('Local prompt answer', { exact: true }).fill('Authored local answer'); await page.getByRole('button', { name: 'Inspect prompt candidate', exact: true }).click(); await expect(outcome(page)).toContainText('Held local'); await page.getByRole('button', { name: 'Inspect local conversation candidate', exact: true }).click(); await expect(page.getByRole('dialog', { name: 'Local conversation candidate inspection' })).toBeVisible(); }
test.beforeEach(async ({ page }) => { await page.goto('/?conversationReview=1'); await expect(page.getByRole('heading', { name: 'Controlled conversation review proof' })).toBeVisible(); await expect(page.getByLabel('Local prompt answer', { exact: true })).toBeVisible(); await expect(page.getByRole('button', { name: 'Stable local count 0' })).toBeVisible(); });
test('actual composer Enter/Shift+Enter/IME/prop history and busy Stop only inspect local draft, never commit rows', async ({ page }) => { const input = composer(page); await input.focus(); await page.keyboard.press('ArrowUp'); await expect(input).toHaveValue('Authored history second'); await page.keyboard.press('ArrowUp'); await expect(input).toHaveValue('Authored history first'); await page.keyboard.press('ArrowDown'); await expect(input).toHaveValue('Authored history second'); await input.fill('Local composer'); await input.evaluate(el => el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, isComposing: true }))); await input.evaluate(el => el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 229, bubbles: true }))); await expect(outcome(page)).toHaveText('No local conversation inspection'); await input.press('Shift+Enter'); await expect(input).toHaveValue('Local composer\n'); await input.press('Enter'); await expect(outcome(page)).toContainText('Held local'); await input.fill('Editable while busy'); await expect(outcome(page)).toHaveText('No local conversation inspection'); await page.getByRole('button', { name: 'Release conversation producer', exact: true }).click(); await expect(outcome(page)).toHaveText('No local conversation inspection'); await page.getByRole('button', { name: 'Advance authored manual preview', exact: true }).click(); await expect(page.locator('[data-slot="chat-stream-streaming"]')).toContainText('Authored manual preview step 1'); await input.fill('During authored preview'); await input.press('Enter'); await expect(outcome(page)).toHaveText('No local conversation inspection'); await page.getByRole('button', { name: 'Stop response', exact: true }).click(); await expect(page.locator('[data-slot="chat-stream-streaming"]')).toHaveCount(0); await input.fill('Fresh after Stop'); await input.press('Enter'); await expect(outcome(page)).toContainText('Held local'); await page.getByRole('button', { name: 'Release conversation producer', exact: true }).click(); await expect(outcome(page)).toContainText('transcript and prior unchanged'); await expect(page.getByText('Committed supplied rows: 12.', { exact: false })).toBeVisible(); await expect(page.getByText('Current raw prior: (absent); actual classification: open.', { exact: false })).toBeVisible(); });
test('actual raw prior matrix controls prompt appearances and host states without guessing open/pending eligibility', async ({ page }) => {
    const prior = page.getByLabel('Authored raw prior status', { exact: true });
    for (const value of ['partial', 'handling', 'submitted', 'canceled', 'cancelled', 'failed', 'error', 'open', 'pending', 'future-status']) {
        await prior.selectOption(value);
        if (['submitted', 'canceled', 'cancelled'].includes(value))
            await expect(page.getByLabel('Local prompt answer', { exact: true })).toHaveCount(0);
        else if (value === 'partial')
            await expect(page.getByLabel('Local prompt answer', { exact: true })).toBeEnabled();
        else
            await expect(page.getByLabel('Local prompt answer', { exact: true })).toBeDisabled();
        if (['open', 'pending', 'future-status'].includes(value))
            await expect(page.getByText(`Recorded status: ${value}. This prompt is locked.`, { exact: true })).toBeVisible();
    }
    await prior.selectOption('');
    for (const phase of ['loading', 'empty', 'error', 'denied', 'locked', 'long']) {
        await page.getByRole('button', { name: `Conversation ${phase}`, exact: true }).click();
        if (phase === 'loading')
            await expect(page.getByText('Loading conversation…', { exact: true })).toBeVisible();
        if (phase === 'empty')
            await expect(page.getByText('No authored conversation records.', { exact: true })).toBeVisible();
        if (phase === 'error')
            await expect(page.getByRole('alert')).toContainText('Authored conversation error');
        if (phase === 'denied')
            await expect(page.getByText('Conversation unavailable or denied; local drafts and candidate inspection retired.', { exact: true })).toBeVisible();
        if (phase === 'locked')
            await expect(page.getByText('Card drafts and responses withheld by current loading/error/locked policy.', { exact: true })).toBeVisible();
        if (phase === 'long')
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
});
test('actual confirmation action/decline and prompt awaited busy state only inspect unchanged raw prior', async ({ page }) => { await page.getByRole('button', { name: 'Review confirmation card', exact: true }).click(); await page.getByLabel('Local review note', { exact: true }).fill('Current local note'); await page.getByRole('button', { name: 'Inspect proposal candidate', exact: true }).click(); await expect(page.getByRole('button', { name: 'Inspect defer candidate', exact: true })).toBeDisabled(); await expect(outcome(page)).toContainText('Held local'); await page.getByRole('button', { name: 'Release conversation producer', exact: true }).click(); await expect(page.getByRole('button', { name: 'Inspect defer candidate', exact: true })).toBeEnabled(); await expect(page.getByText('Current raw prior: (absent); actual classification: open.', { exact: false })).toBeVisible(); await page.getByRole('button', { name: 'Inspect proposal decline', exact: true }).click(); await page.getByRole('button', { name: 'Inspect local conversation candidate', exact: true }).click(); await expect(page.getByRole('dialog').locator('pre')).toContainText('"status": "canceled"'); await page.keyboard.press('Escape'); await page.getByRole('button', { name: 'Release conversation producer', exact: true }).click(); await expect(outcome(page)).toHaveText('No local conversation inspection'); await page.getByRole('button', { name: 'Review prompt card', exact: true }).click(); await page.getByLabel('Local prompt answer', { exact: true }).fill('Local prompt'); await page.getByRole('button', { name: 'Inspect prompt candidate', exact: true }).click(); await expect(page.getByLabel('Local prompt answer', { exact: true })).toBeDisabled(); await expect(page.getByText('Submitting…', { exact: true })).toBeVisible(); await page.getByRole('button', { name: 'Review confirmation card', exact: true }).click(); await page.getByRole('button', { name: 'Release conversation producer', exact: true }).click(); await expect(outcome(page)).toHaveText('No local conversation inspection'); await expect(page.getByRole('button', { name: 'Inspect proposal candidate', exact: true })).toBeEnabled(); });
test('actual transcript owns bounded scroll/history prepend and jump; manual stalled preview stays outside committed rows', async ({ page }) => { const viewport = page.getByLabel('Authored conversation transcript', { exact: true }); await viewport.scrollIntoViewIfNeeded(); await expect.poll(() => viewport.evaluate(el => el.scrollHeight - el.clientHeight - el.scrollTop)).toBeLessThan(4); await viewport.hover(); await page.mouse.wheel(0, -10000); await expect.poll(() => viewport.evaluate(el => el.scrollTop)).toBeLessThan(4); await expect(page.getByRole('button', { name: 'Jump to authored latest', exact: true })).toBeVisible(); const anchor = viewport.locator('[data-slot="chat-stream-item"]').filter({ hasText: 'Recorded row 0:' }); const before = await anchor.boundingBox(); await page.getByRole('button', { name: 'Load older messages', exact: true }).click(); await expect(page.getByText('Committed supplied rows: 20.', { exact: false })).toBeVisible(); await expect.poll(async () => Math.abs((await anchor.boundingBox())!.y - before!.y)).toBeLessThan(4); const metrics = await viewport.evaluate(el => ({ height: el.clientHeight, scroll: el.scrollHeight, overflow: getComputedStyle(el).overflowY })); expect(metrics.height).toBeLessThanOrEqual(420); expect(metrics.scroll).toBeGreaterThan(metrics.height); expect(metrics.overflow).toBe('auto'); await page.getByRole('button', { name: 'Jump to authored latest', exact: true }).click(); await expect.poll(() => viewport.evaluate(el => el.scrollHeight - el.clientHeight - el.scrollTop)).toBeLessThan(4); await page.getByRole('button', { name: 'Advance authored manual preview', exact: true }).click(); await page.getByRole('button', { name: 'Advance authored manual preview', exact: true }).click(); await expect(page.locator('[data-slot="chat-stream-streaming"]')).toHaveAttribute('data-stalled', ''); await expect(page.getByText('Waiting for the response to continue…', { exact: true })).toBeVisible(); await page.getByRole('button', { name: 'Retire authored manual preview', exact: true }).click(); await expect(page.locator('[data-slot="chat-stream-streaming"]')).toHaveCount(0); await expect(page.getByText('Committed supplied rows: 20.', { exact: false })).toBeVisible(); });
for (const change of ['generation', 'owner', 'source', 'context', 'session', 'card'])
    test(`${change} retires actual conversation modal/awaited producer/drafts and preserves independent owner policy`, async ({ page }) => {
        await page.getByRole('button', { name: 'Stable local count 0' }).click();
        await held(page);
        await page.locator('link[href*="fake-ops/g1/style.css"]').evaluate(el => (window as any).conversationOldStyle = el);
        await page.getByRole('button', { name: change === 'generation' ? 'Replace generation from conversation inspection' : change === 'owner' ? 'Withdraw owner from conversation inspection' : change === 'source' ? 'Retire source from conversation inspection' : change === 'context' ? 'Switch context from conversation inspection' : change === 'session' ? 'Switch session from conversation inspection' : 'Switch card from conversation inspection', exact: true }).click();
        await expect(page.getByRole('dialog')).toHaveCount(0);
        await expect(page.getByRole('heading', { name: 'Controlled conversation review proof' })).toBeFocused();
        await page.getByRole('button', { name: change === 'context' ? 'Release retired conversation producer' : 'Release conversation producer', exact: true }).click();
        await expect(outcome(page)).toHaveText('No local conversation inspection');
        if (change !== 'owner') {
            await expect(page.getByLabel('Local prompt answer', { exact: true })).toHaveValue('');
            await expect(page.getByLabel('Local prompt answer', { exact: true })).toBeEnabled();
        }
        expect(await page.evaluate(() => (window as any).conversationOldStyle.isConnected)).toBe(['source', 'session', 'card'].includes(change));
        await expect(page.getByRole('button', { name: ['generation', 'owner', 'session', 'card'].includes(change) ? 'Stable local count 1' : 'Stable local count 0' })).toBeVisible();
    });
test('actual desktop/narrow transcript and modal focus/object/body/footer plus unmount have no effects or optional renderer', async ({ page }) => {
    const effects: string[] = [];
    page.on('request', request => {
        if (!['127.0.0.1:18543', '127.0.0.1:18544'].includes(new URL(request.url()).host) || request.method() !== 'GET')
            effects.push(request.url());
    });
    await page.locator('.conversation-review-columns').evaluate(el => el.scrollIntoView({ block: 'start' }));
    await page.screenshot({ path: '../.scratch/controlled-conversation-desktop.png', fullPage: false });
    await held(page);
    const dialog = page.getByRole('dialog');
    await expect(dialog.locator('pre')).toContainText('card-a-question');
    await page.screenshot({ path: '../.scratch/controlled-conversation-modal-desktop.png', fullPage: false });
    await page.setViewportSize({ width: 390, height: 844 });
    const box = await dialog.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(8);
    expect(box!.y).toBeGreaterThanOrEqual(8);
    expect(box!.x + box!.width).toBeLessThanOrEqual(382);
    expect(box!.y + box!.height).toBeLessThanOrEqual(836);
    await dialog.locator('pre').scrollIntoViewIfNeeded();
    await page.screenshot({ path: '../.scratch/controlled-conversation-modal-narrow-payload.png', fullPage: false });
    await dialog.getByRole('button', { name: 'Release held conversation inspection', exact: true }).scrollIntoViewIfNeeded();
    await expect(dialog.getByRole('button', { name: 'Release held conversation inspection', exact: true })).toBeInViewport();
    await page.screenshot({ path: '../.scratch/controlled-conversation-modal-narrow.png', fullPage: false });
    for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab');
        await expect.poll(() => dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Review prompt card', exact: true })).toBeFocused();
    await page.getByRole('button', { name: 'Release conversation producer', exact: true }).click();
    await expect(outcome(page)).toHaveText('No local conversation inspection');
    await page.locator('.conversation-transcript').evaluate(el => el.scrollIntoView({ block: 'start' }));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= 390)).toBe(true);
    await page.screenshot({ path: '../.scratch/controlled-conversation-narrow.png', fullPage: false });
    await held(page);
    await page.getByRole('button', { name: 'Unmount from conversation inspection', exact: true }).click();
    await page.getByRole('button', { name: 'Release retired conversation producer', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Controlled conversation review' })).toHaveCount(0);
    await expect(page.locator('link[href*="/plugins/"]')).toHaveCount(0);
    expect(effects).toEqual([]);
    await page.goto('/');
    expect(await page.evaluate(() => performance.getEntriesByType('resource').some(e => /conversation-review|streamdown/.test(e.name)))).toBe(false);
    await page.goto('http://127.0.0.1:18544/proof/?conversationReview=1');
    await expect(page.getByLabel('Local prompt answer', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Stable local count 0' })).toBeVisible();
});
