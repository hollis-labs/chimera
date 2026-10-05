import { test, expect } from '@playwright/test';
test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        const state = { created: [] as string[], revoked: [] as string[], capture: [] as string[] };
        Reflect.set(globalThis, 'voiceAudit', state);
        Reflect.set(globalThis, 'SpeechRecognition', class {
            constructor() { state.capture.push('SpeechRecognition'); throw Error('No fixture recognition'); }
        });
        const create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL);
        URL.createObjectURL = (blob) => { const url = create(blob); state.created.push(url); return url; };
        URL.revokeObjectURL = (url) => { state.revoked.push(url); revoke(url); };
        if (navigator.mediaDevices) {
            navigator.mediaDevices.getUserMedia = async () => { state.capture.push('getUserMedia'); throw Error('No fixture capture'); };
            navigator.mediaDevices.enumerateDevices = async () => { state.capture.push('enumerateDevices'); return []; };
        }
    });
    await page.goto('/?voice=1');
    await expect(page.getByRole('heading', { name: 'Controlled voice and media proof' })).toBeVisible();
});
test('actual controlled selector uses keyboard and dialog Escape with disabled capture', async ({ page }) => {
    const trigger = page.getByRole('button', { name: 'Select local voice: calm' });
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog', { name: 'Local fixture voices' })).toBeVisible();
    await page.screenshot({ path: '../.scratch/controlled-voice-dialog.png', fullPage: true });
    await page.getByPlaceholder('Search local voices').fill('clear');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Select local voice: clear' })).toBeVisible();
    await page.getByRole('button', { name: 'Select local voice: clear' }).click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Recording disabled for this fixture' })).toBeDisabled();
    expect(await page.evaluate(() => Reflect.get(globalThis, 'voiceAudit').capture)).toEqual([]);
    await page.screenshot({ path: '../.scratch/controlled-voice-desktop.png', fullPage: true });
});
test('actual local audio playback and transcript keyboard seek follow seconds and active boundaries', async ({ page }) => {
    const audio = page.locator('audio');
    await expect.poll(() => audio.evaluate(element => (element as HTMLAudioElement).duration)).toBe(8);
    const second = page.getByRole('button', { name: 'Second segment', exact: true });
    await second.focus();
    await page.keyboard.press('Enter');
    await expect(second).toHaveAttribute('data-active', 'true');
    const transcriptStyle = await second.evaluate(element => ({ color: getComputedStyle(element).color, fg: getComputedStyle(document.body).color, outline: getComputedStyle(element).outlineWidth }));
    expect(transcriptStyle.color).toBe(transcriptStyle.fg);
    expect(transcriptStyle.outline).toBe('2px');
    await expect(page.getByRole('button', { name: 'Local review', exact: true })).toHaveAttribute('data-active', 'false');
    expect(await audio.evaluate(element => (element as HTMLAudioElement).currentTime)).toBe(2);
    await expect(page.locator('[data-slot="transcription"]').nth(1).locator('button')).toHaveCount(0);
    await page.locator('media-play-button').click();
    await expect.poll(() => audio.evaluate(element => (element as HTMLAudioElement).paused)).toBe(false);
    await page.locator('media-play-button').click();
    await expect.poll(() => audio.evaluate(element => (element as HTMLAudioElement).paused)).toBe(true);
    const style = await page.locator('[data-slot="audio-player"]').evaluate(element => ({ padding: getComputedStyle(element).getPropertyValue('--media-control-padding'), primary: getComputedStyle(element).getPropertyValue('--media-primary-color') }));
    expect(style.padding).toBe('0px');
    expect(style.primary).not.toBe('');
    expect((await page.locator('media-time-range').boundingBox())!.height).toBeGreaterThan(10);
});
for (const retirement of ['context', 'source', 'selection'])
    test(`held preview cannot commit after ${retirement} retirement and old blob is revoked`, async ({ page }) => {
        const outcome = page.getByRole('status', { name: 'Voice preview outcome' }), old = await page.locator('audio').getAttribute('src');
        await page.locator('audio').evaluate(element => Reflect.set(globalThis, 'oldVoicePlayer', element));
        await page.getByRole('button', { name: 'Prepare held voice preview' }).click();
        await expect(outcome).toHaveText('Preview pending');
        if (retirement === 'selection') {
            await page.getByRole('button', { name: 'Select local voice: calm' }).click();
            await page.getByRole('option', { name: 'clear', exact: true }).click();
        }
        else
            await page.getByRole('button', { name: retirement === 'context' ? 'Switch voice context' : 'Retire voice source' }).click();
        await page.getByRole('button', { name: 'Release voice preview' }).click();
        await expect(outcome).toHaveText('Local authored silence ready');
        await page.evaluate(() => { const old = Reflect.get(globalThis, 'oldVoicePlayer'); old.currentTime = 7; old.dispatchEvent(new Event('timeupdate')); old.dispatchEvent(new Event('error')); });
        await expect(outcome).toHaveText('Local authored silence ready');
        await expect.poll(() => page.evaluate(url => Reflect.get(globalThis, 'voiceAudit').revoked.includes(url), old)).toBe(true);
        await expect(page.getByText('Playback seconds: 0.00', { exact: true })).toBeVisible();
        await page.getByRole('button', { name: 'Prepare held voice preview' }).click();
        await page.getByRole('button', { name: 'Release voice preview' }).click();
        await expect(outcome).toContainText('Fixture preview ready:');
        expect(await page.evaluate(() => Reflect.get(globalThis, 'voiceAudit').capture)).toEqual([]);
    });
test('latest held preview wins within the same source and unmount releases audio URL', async ({ page }) => { const outcome = page.getByRole('status', { name: 'Voice preview outcome' }); await page.getByRole('button', { name: 'Prepare held voice preview' }).click(); await page.getByRole('button', { name: 'Prepare held voice preview' }).click(); await page.getByRole('button', { name: 'Release voice preview' }).click(); await expect(outcome).toHaveText('Preview pending'); await page.getByRole('button', { name: 'Release voice preview' }).click(); await expect(outcome).toContainText('Fixture preview ready:'); const url = await page.locator('audio').getAttribute('src'); await page.locator('media-play-button').click(); await expect.poll(() => page.locator('audio').evaluate(element => (element as HTMLAudioElement).paused)).toBe(false); await page.locator('audio').evaluate(element => Reflect.set(globalThis, 'retiredVoicePlayer', element)); await page.getByRole('button', { name: 'Unmount local player' }).click(); await expect(page.locator('audio')).toHaveCount(0); expect(await page.evaluate(() => Reflect.get(globalThis, 'retiredVoicePlayer').paused)).toBe(true); await expect.poll(() => page.evaluate(url => Reflect.get(globalThis, 'voiceAudit').revoked.includes(url), url)).toBe(true); await page.evaluate(() => Reflect.get(globalThis, 'retiredVoicePlayer').dispatchEvent(new Event('error'))); await expect(outcome).toContainText('Fixture preview ready:'); });
test('narrow actual media controls and license assets make no external or mutation requests', async ({ page, request }) => {
    const external: string[] = [], writes: string[] = [];
    page.on('request', request => {
        if (!request.url().startsWith('http://127.0.0.1:18543/') && !request.url().startsWith('blob:http://127.0.0.1:18543/'))
            external.push(request.url());
        if (!['GET', 'HEAD'].includes(request.method()))
            writes.push(request.method());
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Controlled voice and media proof' })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await page.getByRole('button', { name: 'Final segment', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Final segment', exact: true })).toHaveAttribute('data-active', 'true');
    await page.screenshot({ path: '../.scratch/controlled-voice-narrow.png', fullPage: true });
    const response = await request.get('/licenses/kit-voice.LICENSE');
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain('Apache License');
    expect(writes).toEqual([]);
    expect(external).toEqual([]);
    expect(await page.evaluate(() => Reflect.get(globalThis, 'voiceAudit').capture)).toEqual([]);
});
