import { describe, it, expect } from 'vitest';
import { createPlaybackFixture } from '../example/playback-fixture.js';
import { dashboardEvidence } from '../example/dashboard-evidence.js';
describe('app-owned dashboard evidence', () => {
    it('projects current source cutoff counts while preserving zero versus missing', async () => {
        const app = createPlaybackFixture('dashboard-proof');
        for (let index = 0; index < 4; index++) {
            app.seek(index);
            const frame = app.frame.getSnapshot(), evidence = dashboardEvidence(frame);
            expect(evidence.recordedCount).toBe(index + 1);
            expect(evidence.items.reduce((sum, item) => sum + item.value, 0)).toBe(index + 1);
            expect(evidence.observedErrors).toBe(0);
            expect(evidence.spend).toBeNull();
            expect(evidence.cutoff).toBe(frame.cutoff);
            expect(evidence.items.some(item => item.label === 'final fixture outcome')).toBe(index === 3);
        }
        app.retireSource();
        expect(dashboardEvidence(app.frame.getSnapshot())).toMatchObject({ sourceKey: 'source-1', recordedCount: 1, observedErrors: 0, spend: null });
        await app.dispose();
    });
});
