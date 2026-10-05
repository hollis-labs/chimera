import { test, expect } from '@playwright/test';
test.beforeEach(async ({ page }) => { await page.goto('/?shell=1'); await expect(page.getByRole('heading', { name: 'Controlled shell composition' })).toBeVisible(); await expect(page.getByRole('button', { name: 'Stable local count 0' })).toBeVisible(); });
test('one actual shell composes embedded and plugin views while layout changes retain hook state', async ({ page }) => {
    await expect(page.locator('main')).toHaveCount(1);
    await page.getByRole('button', { name: 'Stable local count 0' }).click();
    const panel = page.getByRole('region', { name: 'Shell plugin panel' });
    await panel.getByRole('button', { name: 'Detail state 0' }).click();
    await page.getByRole('button', { name: 'Toggle shell arrangement' }).click();
    await expect(page.getByText('Layout mode: grid; local presentation only.')).toBeVisible();
    expect(await page.getByRole('region', { name: 'Shell plugin widgets' }).evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length)).toBe(2);
    await page.getByRole('button', { name: 'Reverse shell widgets' }).click();
    await expect(page.locator('[data-shell-widget]').first()).toHaveAttribute('data-shell-widget', 'stable');
    await expect(page.getByRole('button', { name: 'Stable local count 1' })).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Detail state 1' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Shell embedded view' })).toContainText('Embedded view: shell-context-a');
    await page.screenshot({ path: '../.scratch/controlled-shell-desktop.png' });
    await page.getByRole('button', { name: 'Reset shell arrangement' }).click();
    await expect(page.getByText('Layout mode: stack; local presentation only.')).toBeVisible();
    await expect(page.locator('[data-shell-widget]').first()).toHaveAttribute('data-shell-widget', 'summary');
    await expect(page.getByRole('button', { name: 'Stable local count 1' })).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Detail state 1' })).toBeVisible();
});
test('intentional visibility and panel selection retirement remount local state without resetting sibling widget', async ({ page }) => {
    await page.getByRole('button', { name: 'Stable local count 0' }).click();
    await page.getByRole('button', { name: 'Fixture provider: unavailable; local count 0' }).click();
    await page.getByRole('button', { name: 'Hide shell summary' }).click();
    await expect(page.getByRole('button', { name: /Fixture provider:/ })).toHaveCount(0);
    await page.getByRole('button', { name: 'Show shell summary' }).click();
    await expect(page.getByRole('button', { name: 'Fixture provider: unavailable; local count 0' })).toBeVisible();
    const panel = page.getByRole('region', { name: 'Shell plugin panel' });
    await panel.getByRole('button', { name: 'Detail state 0' }).click();
    await page.getByRole('button', { name: 'Close shell panel' }).click();
    await expect(panel).toBeEmpty();
    await page.getByRole('button', { name: 'Open shell panel' }).click();
    await expect(panel.getByRole('button', { name: 'Detail state 0' })).toBeVisible();
    await panel.getByRole('button', { name: 'Detail state 0' }).click();
    await page.getByRole('button', { name: 'Plugin details', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Selected shell view: detail' })).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Detail state 0' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Shell plugin page' })).toContainText('Detail context: shell-context-a');
    await expect(page.getByRole('button', { name: 'Stable local count 1' })).toBeVisible();
});
test('owner unload revokes surfaces and CSS while host and sibling content remain', async ({ page }) => {
    await page.getByRole('button', { name: 'Stable local count 0' }).click();
    await expect(page.locator('link[href$="/plugins/fake-ops/g1/style.css"]')).toHaveCount(1);
    const styles = await page.locator('link[href*="/assets/"]').count(), writes: string[] = [];
    page.on('request', request => {
        if (!['GET', 'HEAD'].includes(request.method()))
            writes.push(request.method());
    });
    await page.getByRole('button', { name: 'Unload shell plugin owner' }).click();
    await expect(page.getByRole('button', { name: /Fixture provider:/ })).toHaveCount(0);
    await expect(page.getByRole('region', { name: 'Shell plugin panel' })).toBeEmpty();
    await expect(page.getByRole('button', { name: 'Plugin details', exact: true })).toHaveCount(0);
    await expect(page.locator('link[href$="/plugins/fake-ops/g1/style.css"]')).toHaveCount(0);
    expect(await page.locator('link[href*="/assets/"]').count()).toBe(styles);
    await expect(page.getByRole('button', { name: 'Stable local count 1' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Shell embedded view' })).toContainText('Local read-only shell record 18');
    expect(writes).toEqual([]);
});
test('context switch resets app selection and shared scoped preferences without old leases', async ({ page }) => {
    await page.locator('link[href$="/plugins/fake-ops/g1/style.css"]').evaluate(element => Reflect.set(globalThis, 'oldShellLease', element));
    await page.getByRole('button', { name: 'Toggle shell arrangement' }).click();
    await page.getByRole('button', { name: 'Reverse shell widgets' }).click();
    await page.getByRole('button', { name: 'Hide shell summary' }).click();
    await page.getByRole('button', { name: 'Plugin details', exact: true }).click();
    await page.getByRole('button', { name: 'Close shell panel' }).click();
    await page.getByRole('button', { name: 'Stable local count 0' }).click();
    await page.getByRole('button', { name: 'Switch shell context' }).click();
    await expect(page.getByRole('heading', { name: 'Selected shell view: overview' })).toBeVisible();
    await expect(page.getByText('Layout mode: stack; local presentation only.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Stable local count 0' })).toBeVisible();
    await expect(page.locator('[data-shell-widget]').first()).toHaveAttribute('data-shell-widget', 'summary');
    await expect(page.getByRole('button', { name: 'Fixture provider: unavailable; local count 0' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Shell plugin panel' })).toContainText('Detail context: shell-context-2');
    expect(await page.evaluate(() => Reflect.get(globalThis, 'oldShellLease').isConnected)).toBe(false);
    await expect(page.locator('link[href$="/plugins/fake-ops/g1/style.css"]')).toHaveCount(1);
});
test('desktop main body owns scroll while viewport header and keyboard content focus remain pinned', async ({ page }) => {
    const content = page.locator('[data-shell-scroll-content]').locator('..'), header = page.locator('.shell-header');
    const before = await header.boundingBox();
    expect(await content.evaluate(element => getComputedStyle(element).overflowY)).toBe('auto');
    await content.evaluate(element => element.scrollTop = element.scrollHeight);
    await expect.poll(() => content.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
    expect((await header.boundingBox())!.y).toBe(before!.y);
    await expect(page.getByText('Local read-only shell record 18')).toBeInViewport();
    expect(await page.evaluate(() => document.scrollingElement!.scrollTop)).toBe(0);
    expect(await page.evaluate(() => document.scrollingElement!.scrollHeight)).toBe(720);
    const skip = page.getByRole('link', { name: 'Skip to shell content' });
    await skip.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Selected shell view: overview' })).toBeFocused();
    expect(await page.getByRole('heading', { name: 'Selected shell view: overview' }).evaluate(element => getComputedStyle(element).outlineWidth)).toBe('2px');
    await page.getByRole('button', { name: 'Details', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Details', exact: true })).toHaveAttribute('aria-current', 'page');
    await expect.poll(() => content.evaluate(element => element.scrollTop)).toBe(0);
});
test('narrow overlay contains keyboard focus, selects app route and returns focus on Escape', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const trigger = page.getByRole('button', { name: 'Open shell navigation' });
    await trigger.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Shell navigation' });
    await expect(dialog).toBeVisible();
    await expect.poll(async () => Math.round((await dialog.boundingBox())!.x)).toBe(0);
    await expect.poll(() => dialog.evaluate(element => getComputedStyle(element).opacity)).toBe('1');
    const overlayStyle = await dialog.evaluate(element => { const probe = document.createElement('span'); probe.style.backgroundColor = 'var(--color-bg-elevated)'; document.body.appendChild(probe); const elevated = getComputedStyle(probe).backgroundColor; probe.remove(); return { background: getComputedStyle(element).backgroundColor, elevated, color: getComputedStyle(element).color, fg: getComputedStyle(document.body).color, height: element.getBoundingClientRect().height, width: element.getBoundingClientRect().width }; });
    expect(overlayStyle.background).toBe(overlayStyle.elevated);
    expect(overlayStyle.background).not.toBe('rgba(0, 0, 0, 0)');
    expect(overlayStyle.color).toBe(overlayStyle.fg);
    expect(overlayStyle.height).toBe(844);
    expect(overlayStyle.width).toBe(320);
    for (let i = 0; i < 8; i++)
        await page.keyboard.press('Tab');
    expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
    await page.screenshot({ path: '../.scratch/controlled-shell-overlay.png' });
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await trigger.click();
    await dialog.getByRole('button', { name: 'Details', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expect(page.getByRole('heading', { name: 'Selected shell view: detail' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Shell plugin page' })).toContainText('Detail context: shell-context-a');
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    const content = page.locator('[data-shell-scroll-content]').locator('..');
    expect(await content.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await page.screenshot({ path: '../.scratch/controlled-shell-narrow.png' });
    await content.evaluate(element => element.scrollTop = element.scrollHeight);
    await expect(page.getByText('Local read-only shell record 18')).toBeInViewport();
    expect(await page.evaluate(() => document.scrollingElement!.scrollTop)).toBe(0);
});
for (const delayedRequest of [1, 2])
    test(`retired shell registry request ${delayedRequest} cannot revive an old context`, async ({ page }) => {
        let calls = 0, entered!: () => void, release!: () => void;
        const waiting = new Promise<void>(resolve => { entered = resolve; }), gate = new Promise<void>(resolve => { release = resolve; });
        await page.route('**/plugins/registry', async (route) => {
            if (++calls === delayedRequest) {
                entered();
                await gate;
                try {
                    await route.abort('failed');
                }
                catch { /* retired request */ }
            }
            else
                await route.continue();
        });
        await page.goto('/?shell=1');
        if (delayedRequest === 2) {
            await expect(page.getByRole('button', { name: 'Stable local count 0' })).toBeVisible();
            await page.getByRole('button', { name: 'Switch shell context' }).click();
        }
        await waiting;
        await page.getByRole('button', { name: 'Switch shell context' }).click();
        release();
        const context = `shell-context-${delayedRequest + 1}`;
        await expect(page.getByRole('region', { name: 'Shell embedded view' })).toContainText(`Embedded view: ${context}`);
        await expect(page.getByRole('button', { name: 'Stable local count 0' })).toBeVisible();
        await expect(page.getByRole('region', { name: 'Shell plugin panel' })).toContainText(`Detail context: ${context}`);
        await expect(page.getByText('Shell registry unavailable')).toHaveCount(0);
    });
