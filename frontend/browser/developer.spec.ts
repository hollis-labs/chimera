import { test, expect } from '@playwright/test';
test.beforeEach(async ({ page }) => { await page.goto('/?developer=1'); await expect(page.getByRole('heading', { name: 'Controlled developer and workflow proof' })).toBeVisible(); });
test('actual candidate file review controls selection, expansion and inert local drafts', async ({ page }) => {
    const files = page.getByRole('region', { name: 'Controlled file review' });
    await expect(files.getByRole('button', { name: 'review.ts', exact: true })).toHaveAttribute('aria-current', 'true');
    const unsafe = files.getByRole('button', { name: 'unsafe.ts', exact: true });
    await unsafe.focus();
    await page.keyboard.press('Enter');
    await expect(unsafe).toHaveAttribute('aria-current', 'true');
    await expect(files.locator('code')).toContainText('<script>globalThis.executed = true</script>');
    expect(await page.evaluate(() => Reflect.get(globalThis, 'executed'))).toBeUndefined();
    await expect(files.locator('script')).toHaveCount(0);
    await files.getByRole('textbox', { name: 'Local code draft' }).fill('fixture local draft');
    await expect(files.locator('code')).toContainText('fixture local draft');
    await files.getByRole('button', { name: 'Collapse src' }).click();
    await expect(unsafe).toBeHidden();
    await files.getByRole('button', { name: 'Expand src' }).click();
    await expect(unsafe).toBeVisible();
    await files.getByRole('button', { name: /src\/review.ts/ }).click();
    await expect(files.getByRole('button', { name: 'review.ts', exact: true })).toHaveAttribute('aria-current', 'true');
    await expect(files.getByRole('textbox', { name: 'Local code draft' })).toHaveValue('');
    await page.screenshot({ path: '../.scratch/controlled-developer-desktop.png', fullPage: true });
});
test('actual canvas uses token bridge, keyboard review and immutable graph controls', async ({ page }) => {
    const canvas = page.getByRole('region', { name: 'Controlled workflow review' }), node = canvas.getByLabel('Review Plan node', { exact: true });
    await expect(node).toBeVisible();
    await node.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByText('Focused review: node plan', { exact: true })).toBeVisible();
    await page.keyboard.press('Delete');
    await expect(canvas.getByText('Fixed graph: 2 nodes, 1 edge. Read-only review.')).toBeVisible();
    await expect(canvas.locator('.react-flow__node')).toHaveCount(2);
    await expect(canvas.locator('.react-flow__edge')).toHaveCount(1);
    const style = await canvas.locator('.react-flow').evaluate(element => { const actual = getComputedStyle(element), root = getComputedStyle(document.documentElement); return { background: actual.backgroundColor, bridge: actual.getPropertyValue('--xy-background-color').trim(), surface: root.getPropertyValue('--color-bg').trim() }; });
    expect(style.bridge).toBe(style.surface);
    expect(style.bridge).not.toBe('');
    expect(style.background).not.toBe('rgba(0, 0, 0, 0)');
    await expect(canvas.locator('.kit-workflow .react-flow__node .node-container')).toHaveCount(2);
    expect(await node.locator('.node-container').evaluate(element => getComputedStyle(element).width)).toBe('384px');
    expect(await node.locator('.node-container').evaluate(element => getComputedStyle(element).outlineWidth)).toBe('1px');
    await expect(canvas.locator('.react-flow__controls-interactive')).toHaveCount(0);
    await page.getByRole('button', { name: 'Inspect current selection' }).click();
    await page.getByRole('button', { name: 'Release developer inspector' }).click();
    await expect(page.getByRole('status', { name: 'Developer inspector' })).toContainText('Fixture inspector: node plan');
});
for (const retirement of ['context', 'source', 'selection', 'draft'])
    test(`held inspector cannot commit after ${retirement} retirement`, async ({ page }) => {
        const inspector = page.getByRole('status', { name: 'Developer inspector' });
        await page.getByRole('textbox', { name: 'Local code draft' }).fill('prior local draft');
        await page.getByRole('button', { name: 'Inspect current selection' }).click();
        await expect(inspector).toHaveText('Inspector pending');
        if (retirement === 'context' || retirement === 'source')
            await page.getByRole('button', { name: retirement === 'context' ? 'Switch developer context' : 'Retire developer source' }).click();
        else if (retirement === 'selection')
            await page.getByRole('button', { name: 'unsafe.ts', exact: true }).click();
        else
            await page.getByRole('textbox', { name: 'Local code draft' }).fill('new local draft');
        await page.getByRole('button', { name: 'Release developer inspector' }).click();
        await expect(inspector).toHaveText('No inspector outcome');
        if (retirement === 'context' || retirement === 'source')
            await expect(page.getByRole('textbox', { name: 'Local code draft' })).toHaveValue('');
        await page.getByRole('button', { name: 'Inspect current selection' }).click();
        await page.getByRole('button', { name: 'Release developer inspector' }).click();
        await expect(inspector).toContainText('Fixture inspector:');
    });
test('narrow keyboard review and complete candidate license assets have no external effects', async ({ page, request }) => {
    const external: string[] = [], writes: string[] = [];
    page.on('request', request => { if (!request.url().startsWith('http://127.0.0.1:18543/'))
        external.push(request.url()); if (!['GET', 'HEAD'].includes(request.method()))
        writes.push(request.method()); });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Controlled developer and workflow proof' })).toBeVisible();
    const file = page.getByRole('button', { name: 'unsafe.ts', exact: true });
    await file.focus();
    await page.keyboard.press('Enter');
    await expect(file).toHaveAttribute('aria-current', 'true');
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    const canvas = page.locator('[aria-label="Workflow canvas"]');
    expect((await canvas.boundingBox())!.height).toBe(384);
    const inspectNode = page.getByLabel('Review Inspect node', { exact: true });
    await expect.poll(async () => { const graph = await canvas.boundingBox(), node = await inspectNode.boundingBox(); return Boolean(graph && node && node.x >= graph.x && node.x + node.width <= graph.x + graph.width && node.y >= graph.y && node.y + node.height <= graph.y + graph.height); }).toBe(true);
    await inspectNode.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByText('Focused review: node inspect', { exact: true })).toBeVisible();
    const padding = await page.getByRole('group', { name: 'Files', exact: true }).evaluate(element => getComputedStyle(element).paddingLeft);
    expect(parseFloat(padding)).toBe(8);
    await page.screenshot({ path: '../.scratch/controlled-developer-narrow.png', fullPage: true });
    for (const name of ['kit-code', 'kit-workflow']) {
        const response = await request.get(`/licenses/${name}.LICENSE`);
        expect(response.status()).toBe(200);
        const text = await response.text();
        expect(text).toContain('Apache License');
        expect(text).toContain('Permission is hereby granted');
    }
    expect(writes).toEqual([]);
    expect(external).toEqual([]);
});
