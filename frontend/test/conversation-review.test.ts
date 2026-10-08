import { it, expect, vi } from 'vitest';
import type { ContributionView } from '@hollis-labs/plugin-host-ui';
import { acceptsInput, classifyPriorResponse } from '@hollis-labs/kit-chat';
import { createPlaybackFixture } from '../example/playback-fixture.js';
import { createConversationReviewFixture } from '../example/conversation-review-fixture.js';
function controlled() { const app = createPlaybackFixture('a'); let generation = 'g1', available = true; vi.spyOn(app, 'select').mockImplementation(() => [{ id: 'same', ref: { owner: 'fake-ops', hostInstance: 'host', generation } } as ContributionView]); vi.spyOn(app.runtime, 'isCurrent').mockImplementation(() => available); const fixture = createConversationReviewFixture(app); return { app, fixture, replace() { generation = 'g2'; }, withdraw() { available = false; } }; }
it('consumes actual total prior classifier including raw open/pending unknown, not invented interactive statuses', () => { for (const prior of [null, undefined, '', 'partial'])
    expect(acceptsInput(classifyPriorResponse(prior))).toBe(true); for (const prior of ['handling', 'submitted', 'canceled', 'cancelled', 'failed', 'error', 'open', 'pending', 'future'])
    expect(acceptsInput(classifyPriorResponse(prior))).toBe(false); expect(classifyPriorResponse('handling')).toEqual({ kind: 'pending' }); expect(classifyPriorResponse('open')).toEqual({ kind: 'unrecognized', status: 'open' }); });
it('actual card promise stays held, settles on release without changing raw prior or controlled draft', async () => { const c = controlled(), f = c.fixture; f.capture().prompt('  Local answer  '); let settled = false; const promise = f.capture().respondPrompt({ status: 'submitted', answers: [{ questionId: 'card-a-question', value: 'Local answer' }] }).then(() => { settled = true; }); await Promise.resolve(); expect(settled).toBe(false); f.release(); await promise; expect(f.state.getSnapshot().output).toContain('prior unchanged'); expect(f.state.getSnapshot().prior).toBe(''); expect(f.state.getSnapshot().prompt).toBe('  Local answer  '); f.dispose(); await c.app.dispose(); });
it('retirement settles UI responder while ignoring-abort late producer remains fenced, including stale currentness without notification', async () => { for (const change of ['generation', 'owner', 'source', 'unmount'] as const) {
    const c = controlled(), f = c.fixture;
    f.capture().prompt('Local');
    const promise = f.capture().respondPrompt({ status: 'submitted', answers: [{ questionId: 'card-a-question', value: 'Local' }] });
    if (change === 'generation')
        c.replace();
    else if (change === 'owner')
        c.withdraw();
    else if (change === 'source')
        c.app.retireSource();
    else
        f.dispose();
    f.refresh();
    await promise;
    f.release();
    await Promise.resolve();
    expect(f.state.getSnapshot().intent).toBeNull();
    expect(f.state.getSnapshot().busy).toBe(false);
    f.dispose();
    await c.app.dispose();
} });
it('current draft/question/action/note/selection/prior policy rejects forged and retained outcomes immediately and at commit', async () => { const c = controlled(), f = c.fixture; f.capture().prompt('Exact'); for (const answers of [[{ questionId: 'wrong', value: 'Exact' }], [{ questionId: 'card-a-question', value: 'old' }]]) {
    await f.capture().respondPrompt({ status: 'submitted', answers });
    expect(f.state.getSnapshot().busy).toBe(false);
} f.capture().selection('confirmation'); await f.capture().respondConfirmation({ status: 'submitted', decisions: [{ itemId: 'wrong', action: 'card-a-inspect' }] }); expect(f.state.getSnapshot().busy).toBe(false); const old = f.capture(); f.capture().note('Changed note'); await old.respondConfirmation({ status: 'canceled' }); expect(f.state.getSnapshot().busy).toBe(false); const promise = f.capture().respondConfirmation({ status: 'submitted', decisions: [{ itemId: 'card-a-inspect', action: 'card-a-inspect' }] }); const live = f.state.getSnapshot(); f.state.set({ ...live, note: 'Changed outside observer' }); f.release(); await promise; expect(f.state.getSnapshot().intent).toBeNull(); expect(f.state.getSnapshot().output).toContain('retired'); f.capture().prior('open'); await f.capture().respondConfirmation({ status: 'canceled' }); f.capture().prompt('Not accepted'); expect(f.state.getSnapshot().prompt).toBe(''); expect(f.state.getSnapshot().busy).toBe(false); f.dispose(); await c.app.dispose(); });
it('busy editable composer, Stop and finite manual preview share admission/commit policy without committed rows', async () => { const c = controlled(), f = c.fixture; f.capture().step(); f.capture().draft('During preview'); await f.capture().submit('During preview'); expect(f.state.getSnapshot().busy).toBe(false); f.capture().stop(); const promise = f.capture().submit('During preview'); expect(f.state.getSnapshot().busy).toBe(true); f.capture().draft('Edited busy draft'); await promise; expect(f.state.getSnapshot().intent).toBeNull(); f.release(); await Promise.resolve(); expect(f.state.getSnapshot().output).toBe('No local conversation inspection'); const next = f.capture().submit('Edited busy draft'); f.release(); await next; expect(f.state.getSnapshot().output).toContain('transcript and prior unchanged'); f.capture().step(); f.capture().step(); f.capture().step(); expect(f.state.getSnapshot().streamStep).toBe(2); f.dispose(); await c.app.dispose(); });
it('session/card/prior/selection/local close retire responders; stale close cannot clear a fresh candidate', async () => { const c = controlled(), f = c.fixture; f.capture().draft('Local'); const one = f.capture().submit('Local'); f.capture().open(true); const old = f.capture(); f.capture().open(false); await one; const two = f.capture().submit('Local'); f.capture().open(true); old.open(false); expect(f.state.getSnapshot().open).toBe(true); f.capture().session(); await two; expect(f.state.getSnapshot().draft).toBe(''); f.capture().prompt('New'); const three = f.capture().respondPrompt({ status: 'canceled' }); f.capture().card(); await three; expect(f.state.getSnapshot().prompt).toBe(''); f.release(); await Promise.resolve(); expect(f.state.getSnapshot().intent).toBeNull(); f.dispose(); f.dispose(); await c.app.dispose(); });
