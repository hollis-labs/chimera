import { test, expect } from '@playwright/test';
test.beforeEach(async ({ page }) => { await page.goto('/?observations=1'); await expect(page.getByRole('heading', { name: 'Controlled observation proof' })).toBeVisible(); });
test('actual observations distinguish unknown/missing/zero and preserve exact bounded UTC sample history', async ({ page }) => {
    const health = page.getByRole('region', { name: 'Fixture process health' }), zero = page.getByRole('region', { name: 'Completed requests' }), missing = page.getByRole('region', { name: 'Missing storage sample' }), ratio = page.getByRole('region', { name: 'Occupancy ratio' }), percent = page.getByRole('region', { name: 'Utilization percent' });
    await expect(health.getByText('unknown', { exact: true }).first()).toBeVisible();
    await expect(zero.getByText('0', { exact: true })).toBeVisible();
    await expect(zero.getByText('count · cumulative counter', { exact: true })).toBeVisible();
    await expect(missing.getByText('Missing sample', { exact: true })).toBeVisible();
    await expect(ratio.getByText('0.5', { exact: true })).toBeVisible();
    await expect(percent.getByText('50', { exact: true })).toBeVisible();
    const table = page.getByRole('table', { name: 'Fixture exact sample history samples in UTC; values in count' });
    await expect(table.getByRole('row')).toHaveCount(5);
    expect(await table.locator('tbody td').allTextContents()).toEqual(['0', 'No sample', '2', '1']);
    expect(await table.locator('tbody time').allTextContents()).toEqual(['2026-10-04T23:59:53.000Z', '2026-10-04T23:59:54.000Z', '2026-10-04T23:59:55.000Z', '2026-10-04T23:59:56.000Z']);
    const series = page.getByRole('region', { name: 'Fixture exact sample history' });
    await expect(series.getByText(/Resource bounds: 4 points, 3s per window/)).toBeVisible();
    await expect(series.locator('.recharts-line')).toBeVisible();
    const box = await series.locator('.h-48').boundingBox();
    expect(box!.height).toBe(192);
    await page.screenshot({ path: '../.scratch/controlled-observations-desktop.png', fullPage: true });
});
test('held refresh and failure retain original evidence/time and isolate sibling resources', async ({ page }) => {
    const health = page.getByRole('region', { name: 'Fixture process health' }), zero = page.getByRole('region', { name: 'Completed requests' }), missing = page.getByRole('region', { name: 'Missing storage sample' });
    const stamp = await zero.locator('time').getAttribute('datetime'), healthStamp = await health.locator('time').getAttribute('datetime');
    await page.getByRole('button', { name: 'Refresh requests failure' }).click();
    await expect(zero).toHaveAttribute('aria-busy', 'true');
    await expect(zero.getByText('0', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Advance observation clock' }).click();
    await page.getByRole('button', { name: 'Release observation producer' }).click();
    await expect(zero.getByText('Scripted zero refresh failed')).toBeVisible();
    await expect(zero.getByText('0', { exact: true })).toBeVisible();
    await expect(zero.locator('time')).toHaveAttribute('datetime', stamp!);
    await expect(health.locator('time')).toHaveAttribute('datetime', healthStamp!);
    await expect(missing.getByText('Missing sample', { exact: true })).toBeVisible();
    await expect(missing.getByRole('alert')).toHaveCount(0);
    await page.getByRole('button', { name: 'Refresh requests success' }).click();
    await page.getByRole('button', { name: 'Release observation producer' }).click();
    await expect(zero.getByText('99', { exact: true })).toBeVisible();
    await expect(zero.locator('time')).toHaveAttribute('datetime', '2026-10-05T00:00:10.000Z');
    await expect(health.locator('time')).toHaveAttribute('datetime', healthStamp!);
    const series = page.getByRole('region', { name: 'Fixture exact sample history' }), diagnostics = page.getByRole('region', { name: 'Fixture diagnostics' }), table = series.getByRole('table'), seriesStamp = await series.locator('time').first().getAttribute('datetime'), diagnosticStamp = await diagnostics.locator('time').getAttribute('datetime'), values = await table.locator('tbody td').allTextContents();
    await page.getByRole('button', { name: 'Refresh series failure' }).click();
    await expect(table).toBeVisible();
    await page.getByRole('button', { name: 'Release observation producer' }).click();
    await expect(series.getByText('Scripted series refresh failed')).toBeVisible();
    await expect(series.locator('time').first()).toHaveAttribute('datetime', seriesStamp!);
    expect(await table.locator('tbody td').allTextContents()).toEqual(values);
    await page.getByRole('button', { name: 'Refresh diagnostics failure' }).click();
    await page.getByRole('button', { name: 'Release observation producer' }).click();
    await expect(diagnostics.getByText('Scripted diagnostics refresh failed')).toBeVisible();
    await expect(diagnostics.locator('time')).toHaveAttribute('datetime', diagnosticStamp!);
    await expect(diagnostics.getByRole('button', { name: 'Copy Fixture diagnostics data', exact: true })).toBeVisible();
    await diagnostics.locator('summary').focus();
    await page.keyboard.press('Enter');
    await expect(diagnostics.locator('details')).toHaveAttribute('open', '');
    await page.getByRole('button', { name: 'Refresh health failure' }).click();
    await page.getByRole('button', { name: 'Release observation producer' }).click();
    await expect(health.getByText('Scripted health refresh failed')).toBeVisible();
    await expect(health.getByText('unknown', { exact: true }).first()).toBeVisible();
    await expect(health.locator('time')).toHaveAttribute('datetime', healthStamp!);
});
test('initial/loading/error and diagnostic validation never fabricate usable evidence', async ({ page }) => {
    const health = page.getByRole('region', { name: 'Fixture process health' }), zero = page.getByRole('region', { name: 'Completed requests' }), diagnostics = page.getByRole('region', { name: 'Fixture diagnostics' });
    await page.getByRole('button', { name: 'initial-loading', exact: true }).click();
    await expect(health).toHaveAttribute('aria-busy', 'true');
    await expect(health.getByText('unknown', { exact: true })).toHaveCount(0);
    await expect(zero.getByText('0', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('table')).toHaveCount(0);
    await page.getByRole('button', { name: 'initial-error', exact: true }).click();
    await expect(health.getByText('Scripted initial observation failed')).toBeVisible();
    await expect(health.getByText('healthy', { exact: true })).toHaveCount(0);
    await expect(zero.getByText('0', { exact: true })).toHaveCount(0);
    for (const scenario of ['invalid-diagnostics', 'unsupported-diagnostics']) {
        await page.getByRole('button', { name: scenario, exact: true }).click();
        await expect(diagnostics.getByText('App rejected this fixture diagnostic projection')).toBeVisible();
        await expect(diagnostics.getByRole('button', { name: /Copy/ })).toHaveCount(0);
    }
});
for (const retirement of ['context', 'source', 'supersede'])
    test(`held observation producer cannot commit after ${retirement}`, async ({ page }) => {
        const zero = page.getByRole('region', { name: 'Completed requests' }), health = page.getByRole('region', { name: 'Fixture process health' });
        await page.getByRole('button', { name: 'Refresh requests success' }).click();
        await page.getByRole('button', { name: 'Refresh health success' }).click();
        if (retirement === 'supersede')
            await page.getByRole('button', { name: 'Refresh requests failure' }).click();
        else
            await page.getByRole('button', { name: retirement === 'context' ? 'Switch observation context' : 'Retire observation source' }).click();
        await page.getByRole('button', { name: 'Release observation producer' }).click();
        await expect(zero.getByText('0', { exact: true })).toBeVisible();
        await expect(zero.getByText('99', { exact: true })).toHaveCount(0);
        await page.getByRole('button', { name: 'Release observation producer' }).click();
        if (retirement === 'supersede') {
            await expect(health.getByText('unhealthy', { exact: true }).first()).toBeVisible();
            await page.getByRole('button', { name: 'Release observation producer' }).click();
            await expect(zero.getByText('Scripted zero refresh failed')).toBeVisible();
        }
        else {
            await expect(health.getByText('unknown', { exact: true }).first()).toBeVisible();
            await expect(health.getByText('unhealthy', { exact: true })).toHaveCount(0);
        }
    });
test('fixed clock/skew and accessible narrow series states preserve exact evidence', async ({ page }) => {
    const series = page.getByRole('region', { name: 'Fixture exact sample history' }), table = page.getByRole('table', { name: 'Fixture exact sample history samples in UTC; values in count' });
    const cells = await table.locator('tbody time').allTextContents();
    await page.getByRole('button', { name: 'Advance observation clock' }).click();
    await expect(series.getByText('Stale', { exact: true })).toBeVisible();
    expect(await table.locator('tbody time').allTextContents()).toEqual(cells);
    await page.getByRole('button', { name: 'Skew observation clock' }).click();
    await expect(series.getByText('Observation time unavailable', { exact: true })).toBeVisible();
    expect(await table.locator('tbody time').allTextContents()).toEqual(cells);
    await page.getByRole('button', { name: 'ready', exact: true }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(table).toBeVisible();
    const column = table.getByRole('columnheader', { name: 'Time (UTC)' });
    expect(parseFloat(await column.evaluate(element => getComputedStyle(element).paddingLeft))).toBe(8);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await page.screenshot({ path: '../.scratch/controlled-observations-narrow.png', fullPage: true });
    await page.getByRole('button', { name: 'truncated-series', exact: true }).click();
    await expect(series.getByText('Incomplete series', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'empty-series', exact: true }).click();
    await expect(series.getByText('No samples in requested range', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'unsupported-series', exact: true }).click();
    await expect(table).toHaveCount(0);
    await page.getByRole('button', { name: 'paused', exact: true }).click();
    await expect(series.getByText('Paused', { exact: true })).toBeVisible();
});
