import { describe, it, expect, vi } from 'vitest';
import { createPlaybackFixture } from '../example/playback-fixture.js';
import { createWidgetsFixture, widgetEvidence } from '../example/widgets-fixture.js';
import type { ContributionView } from '@hollis-labs/plugin-host-ui';
describe('private controlled widget evidence', () => {
    it('projects aligned finite nonnegative prefix counts, truthful zero and terminal proportions', async () => {
        const app = createPlaybackFixture('a');
        for (let index = 0; index < 4; index++) {
            app.seek(index);
            const e = widgetEvidence(app);
            expect(e.primary).toHaveLength(index + 1);
            expect(e.secondary).toHaveLength(index + 1);
            expect([...e.primary, ...e.secondary].every(v => Number.isFinite(v) && v >= 0)).toBe(true);
            expect(e.records.every(r => r.at <= e.frame.cutoff)).toBe(true);
            expect(e.records).toHaveLength(index + 1);
            expect(e.segments.reduce((a, b) => a + b.value, 0)).toBe(index + 1);
            expect(e.segments[1].value).toBe(index === 3 ? 1 : 0);
            if (index === 0)
                expect(e.peak).toBe(0);
        }
        await app.dispose();
    });
    it('rechecks actual scope policy at callbacks and retires generation, frame and unavailable selections', async () => {
        const app = createPlaybackFixture('a');
        let generation = 'g1', available = true;
        vi.spyOn(app, 'select').mockImplementation(() => [{ id: 'same', ref: { owner: 'fake-ops', hostInstance: 'host', generation } } as ContributionView]);
        vi.spyOn(app.runtime, 'isCurrent').mockImplementation(() => available);
        const f = createWidgetsFixture(app);
        f.capture().select(app.frame.getSnapshot().cutoff);
        const old = f.capture();
        generation = 'g2';
        old.signal('primary');
        expect(f.state.getSnapshot().selected).toBeUndefined();
        expect(f.state.getSnapshot().signal).toBe('both');
        f.capture().signal('primary');
        const oldFrame = f.capture();
        app.seek(2);
        oldFrame.layout();
        expect(f.state.getSnapshot().compact).toBe(false);
        expect(f.state.getSnapshot().signal).toBe('both');
        const retired = f.capture();
        available = false;
        retired.select(app.frame.getSnapshot().cutoff);
        expect(f.state.getSnapshot().available).toBe(false);
        f.dispose();
        f.dispose();
        retired.layout();
        expect(f.state.getSnapshot().compact).toBe(false);
        await app.dispose();
    });
});
