import { describe, it, expect, vi } from 'vitest';
import type { ContributionView } from '@hollis-labs/plugin-host-ui';
import { createPlaybackFixture } from '../example/playback-fixture.js';
import { authoredAccountSnapshot, createAccountReviewFixture, validProfile } from '../example/account-review-fixture.js';
function controlled() { const app = createPlaybackFixture('a'); let generation = 'g1', available = true, metadata = authoredAccountSnapshot('ready'); vi.spyOn(app, 'select').mockImplementation(() => [{ id: 'same', ref: { owner: 'fake-ops', hostInstance: 'host', generation } } as ContributionView]); vi.spyOn(app.runtime, 'isCurrent').mockImplementation(() => available); const fixture = createAccountReviewFixture(app, () => metadata); return { app, fixture, replace() { generation = 'g2'; }, withdraw() { available = false; }, change(next: typeof metadata) { metadata = next; }, metadata: () => metadata }; }
describe('private controlled account intent presentation', () => {
    it('mirrors optional native email/name semantics without invisible caps, leaving fictional identity unchanged', async () => { const c = controlled(), f = c.fixture; for (const email of ['', 'a@b', 'x+y@example.invalid'])
        expect(validProfile({ displayName: 'x'.repeat(400), email })).toBe(true); for (const email of ['missing', 'a@@b', 'a@b..c'])
        expect(validProfile({ displayName: 'Name', email })).toBe(false); expect(validProfile({ displayName: '  ', email: '' })).toBe(false); f.capture().profile({ displayName: 'New draft', email: 'a@b' }); f.capture().saveProfile(f.state.getSnapshot().profile); f.release(); await Promise.resolve(); expect(f.state.getSnapshot().output).toContain('supplied metadata unchanged'); expect(c.metadata().profile.displayName).toBe('Editable reviewer A'); expect(c.metadata().identity).toEqual(authoredAccountSnapshot('ready').identity); f.dispose(); await c.app.dispose(); });
    it('refuses unknown principal, current denied/read-only/busy/error and duplicate/unknown scopes immediately and before commit', async () => { const c = controlled(), f = c.fixture; for (const scenario of ['unknown', 'denied', 'read-only', 'busy', 'loading', 'error'] as const) {
        c.change(authoredAccountSnapshot(scenario));
        f.capture().saveProfile(f.state.getSnapshot().profile);
        expect(f.state.getSnapshot().busy).toBe(false);
    } c.change(authoredAccountSnapshot('ready')); for (const scopes of [['review', 'review'], ['missing']]) {
        f.capture().draft({ name: 'Long metadata '.repeat(50), scopes });
        f.capture().create(f.state.getSnapshot().draft);
        expect(f.state.getSnapshot().busy).toBe(false);
    } f.capture().draft({ name: 'Long metadata '.repeat(50), scopes: ['review'] }); f.capture().create(f.state.getSnapshot().draft); expect(f.state.getSnapshot().busy).toBe(true); c.change({ ...c.metadata(), scopes: [] }); f.release(); await Promise.resolve(); expect(f.state.getSnapshot().output).toContain('retired'); expect(c.metadata().tokens).toHaveLength(2); f.dispose(); await c.app.dispose(); });
    it('confirmation requires current target and lease; mode/draft/target transitions invalidate eligible retained callbacks', async () => { const c = controlled(), f = c.fixture; f.capture().target('active'); const old = f.capture(); f.capture().target(null); old.revoke('active'); f.capture().revoke('active'); expect(f.state.getSnapshot().busy).toBe(false); f.capture().target('active'); const mode = f.capture(); f.capture().mode('metadata'); mode.revoke('active'); expect(f.state.getSnapshot().target).toBeNull(); f.capture().target('active'); const draft = f.capture(); f.capture().draft({ name: 'Local', scopes: ['review'] }); draft.revoke('active'); expect(f.state.getSnapshot().target).toBeNull(); f.capture().target('active'); f.capture().revoke('active'); expect(f.state.getSnapshot().target).toBeNull(); c.change({ ...c.metadata(), tokens: c.metadata().tokens.map(t => ({ ...t, canRevoke: false })) }); f.release(); await Promise.resolve(); expect(f.state.getSnapshot().output).toContain('retired'); f.dispose(); await c.app.dispose(); });
    it('source/same-ID generation/currentness and unmount retire ignoring-abort producers without observer notification', async () => { for (const retirement of ['source', 'generation', 'owner', 'unmount'] as const) {
        const c = controlled(), f = c.fixture;
        f.capture().savePreferences();
        const stale = f.capture();
        if (retirement === 'source')
            c.app.retireSource();
        else if (retirement === 'generation')
            c.replace();
        else if (retirement === 'owner')
            c.withdraw();
        else
            f.dispose();
        f.release();
        await Promise.resolve();
        expect(f.state.getSnapshot().intent).toBeNull();
        expect(f.state.getSnapshot().busy).toBe(false);
        stale.connect('disconnected');
        expect(f.state.getSnapshot().busy).toBe(false);
        f.dispose();
        await c.app.dispose();
    } });
    it('close retires the held candidate; retained close cannot close a fresh dialog or commit after metadata changes', async () => { const c = controlled(), f = c.fixture; f.capture().connect('disconnected'); f.capture().open(true); const oldClose = f.capture(); f.capture().open(false); f.capture().disconnect('connected'); f.capture().open(true); oldClose.open(false); expect(f.state.getSnapshot().open).toBe(true); f.release(); await Promise.resolve(); expect(f.state.getSnapshot().intent?.kind).toBe('disconnect'); expect(f.state.getSnapshot().output).toContain('Reviewed local'); f.capture().open(false); f.capture().connect('unknown'); expect(f.state.getSnapshot().busy).toBe(false); f.capture().connect('disconnected'); c.change({ ...c.metadata(), accounts: c.metadata().accounts.map(a => ({ ...a, status: 'connected' })) }); f.release(); await Promise.resolve(); expect(f.state.getSnapshot().intent).toBeNull(); f.dispose(); await c.app.dispose(); });
});
