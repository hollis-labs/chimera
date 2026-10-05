import { test, expect, type Page } from '@playwright/test';
async function seek(page: Page, index: number) {
    const slider = page.getByRole('slider', { name: 'Playback boundary' });
    await slider.focus();
    await page.keyboard.press('Home');
    for (let i = 0; i < index; i++)
        await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('status', { name: 'Playback clock' })).toContainText(`Frame ${index}/3`);
}
test.beforeEach(async ({ page }) => { await page.goto('/?dashboard=1'); await expect(page.getByRole('heading', { name: 'Controlled dashboard composition proof' })).toBeVisible(); await expect(page.getByRole('button', { name: 'Stable local count 0' })).toBeVisible(); });
test('actual dashboard cards keep zero distinct from unknown and categories truthful to cutoff', async ({ page }) => {
    const evidence = page.getByRole('region', { name: 'Recorded dashboard evidence' });
    await expect(evidence).toContainText('Not collected');
    await expect(evidence).toContainText('authored zero');
    await expect(evidence).toContainText('2026-10-05T12:00:00.000Z');
    await expect(evidence).not.toContainText('final fixture outcome');
    await expect(evidence).toContainText('partial recorded prefix');
    await seek(page, 2);
    await expect(evidence).toContainText('review ready');
    await expect(evidence).not.toContainText('final fixture outcome');
    await seek(page, 3);
    await expect(evidence).toContainText('final fixture outcome');
    await expect(evidence).toContainText('complete authored fixture');
    await seek(page, 0);
    await expect(evidence).not.toContainText('final fixture outcome');
});
test('composition changes retain keyed widget hooks and unaffected held action authority', async ({ page }) => {
    await seek(page, 2);
    await page.getByRole('button', { name: 'Stable local count 0' }).click();
    await page.getByRole('button', { name: 'Detail state 0' }).click();
    await page.getByRole('button', { name: 'Fixture provider: unavailable; local count 0' }).click();
    await page.getByRole('button', { name: 'Prepare held playback producer' }).click();
    const invocation = await page.getByRole('status', { name: 'Validated playback invocation' }).textContent();
    const style = page.locator('link[href*="fake-ops/g1/style.css"]');
    await expect(style).toHaveCount(1);
    expect(await page.locator('.playback-columns').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(2);
    await page.getByRole('button', { name: 'Toggle compact dashboard' }).click();
    expect(await page.locator('.playback-columns').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(1);
    await page.getByRole('button', { name: 'Reverse dashboard widgets' }).click();
    expect(await page.getByRole('region', { name: 'Playback plugin presentation' }).evaluate(el => { const buttons = Array.from(el.querySelectorAll('button')); return buttons.findIndex(button => button.textContent?.startsWith('Stable local count')) < buttons.findIndex(button => button.textContent?.startsWith('Fixture provider')); })).toBe(true);
    await page.getByRole('button', { name: 'Toggle summary widget' }).click();
    await expect(page.getByRole('button', { name: 'Stable local count 1' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Detail state 1' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Fixture provider: unavailable; local count/ })).toHaveCount(0);
    await expect(page.getByRole('status', { name: 'Validated playback invocation' })).toHaveText(invocation!);
    await expect(page.getByRole('region', { name: 'Playback receipts' })).toContainText('pending');
    await expect(style).toHaveCount(1);
    await page.getByRole('button', { name: 'Release playback producer', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Playback receipts' })).toContainText('simulated success');
    await page.getByRole('button', { name: 'Toggle summary widget' }).click();
    await page.getByRole('button', { name: 'Toggle compact dashboard' }).click();
    await expect(page.getByRole('button', { name: 'Stable local count 1' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Fixture provider: unavailable; local count 0' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Detail state 1' })).toBeVisible();
    await page.screenshot({ path: '../.scratch/controlled-dashboard-desktop.png', fullPage: true });
});
test('dashboard frame/context/owner retirement preserve embedded counts without old producer effects', async ({ page }) => {
    await seek(page, 2);
    await page.getByRole('button', { name: 'Prepare held playback producer' }).click();
    await page.getByRole('button', { name: 'Retire playback source' }).click();
    await page.getByRole('button', { name: 'Release playback producer', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Playback receipts' })).toBeEmpty();
    await expect(page.getByRole('region', { name: 'Recorded dashboard evidence' })).toContainText('source-1');
    await expect(page.getByRole('region', { name: 'Playback plugin presentation' })).toContainText('source-1: frame 0');
    await page.getByRole('button', { name: 'Prepare held playback producer' }).click();
    await page.getByRole('button', { name: 'Switch playback context' }).click();
    await expect(page.getByRole('region', { name: 'Playback plugin presentation' })).toContainText('playback-context-2/source-a');
    await page.getByRole('button', { name: 'Release retired playback producer' }).click();
    await expect(page.getByRole('region', { name: 'Playback receipts' })).toBeEmpty();
    await page.getByRole('button', { name: 'Unload playback plugin owner' }).click();
    await expect(page.getByRole('button', { name: 'Stable local count 0' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Fixture provider: unavailable; local count/ })).toHaveCount(0);
    await expect(page.locator('link[href*="fake-ops/g1/style.css"]')).toHaveCount(0);
    await expect(page.getByRole('region', { name: 'Recorded dashboard evidence' })).toContainText('Recorded events');
});
test('narrow dashboard keyboard controls have current tokens, one document scroll and no effects', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seek(page, 1);
    await expect(page.getByRole('slider', { name: 'Playback boundary' })).toBeFocused();
    await expect(page.getByRole('slider', { name: 'Playback boundary' })).toHaveCSS('outline-width', '2px');
    await page.getByRole('button', { name: 'Toggle compact dashboard' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Toggle compact dashboard' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('region', { name: 'Playback plugin presentation' })).toContainText('frame 1');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.locator('main').evaluate(el => Array.from(el.querySelectorAll('*')).filter(child => ['auto', 'scroll'].includes(getComputedStyle(child).overflowY) && child.scrollHeight > child.clientHeight).length)).toBe(0);
    const colors = await page.getByRole('region', { name: 'Recorded dashboard evidence' }).evaluate(el => {
        const text = el.querySelector('.text-text')!, header = el.querySelector('.bg-panel')!;
        const subtle = el.querySelector('.text-text-subtle')!, bar = el.querySelector('.bg-panel-2')!, probe = document.createElement('span');
        probe.style.color = 'var(--hl-fg-muted)';
        document.body.append(probe);
        const expectedMuted = getComputedStyle(probe).color;
        probe.remove();
        return { fg: getComputedStyle(text).color, panel: getComputedStyle(header).backgroundColor, expectedFg: getComputedStyle(document.body).color, transparent: getComputedStyle(header).backgroundColor === 'rgba(0, 0, 0, 0)', muted: getComputedStyle(subtle).color, expectedMuted, barBg: getComputedStyle(bar).backgroundColor };
    });
    expect(colors.fg).toBe(colors.expectedFg);
    expect(colors.transparent).toBe(false);
    expect(colors.muted).toBe(colors.expectedMuted);
    expect(colors.barBg).not.toBe('rgba(0, 0, 0, 0)');
    const effects: string[] = [];
    page.on('request', request => {
        if (request.method() !== 'GET' || new URL(request.url()).origin !== 'http://127.0.0.1:18543')
            effects.push(request.url());
    });
    await page.getByRole('button', { name: 'Reset playback' }).click();
    await page.getByRole('button', { name: 'Toggle summary widget' }).click();
    await page.screenshot({ path: '../.scratch/controlled-dashboard-narrow.png', fullPage: true });
    expect(effects).toEqual([]);
});
