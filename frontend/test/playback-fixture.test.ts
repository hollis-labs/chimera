import { it, expect } from 'vitest';
import { createPlaybackFixture, playbackBoundaries } from '../example/playback-fixture.js';
it('one cutoff snapshot feeds actual props and invocation without future fixture records', async () => {
    const app = createPlaybackFixture('unit-context');
    expect(app.runtime.renderContext).toBe(app.frame);
    expect(app.actions.adapter.invocation).toBe(app.frame);
    for (let index = 0; index < playbackBoundaries.length; index++) {
        app.seek(index);
        const frame = app.frame.getSnapshot();
        expect(frame.cutoff).toBe(playbackBoundaries[index]);
        expect(frame.records).toHaveLength(index + 1);
        expect(frame.records.every(record => record.at <= frame.cutoff)).toBe(true);
        expect(Object.hasOwn(frame, 'outcome')).toBe(index === 3);
        if (index < 3)
            expect(JSON.stringify(frame)).not.toContain('final fixture outcome');
    }
    app.seek(0);
    expect(app.frame.getSnapshot().records).toHaveLength(1);
    expect(JSON.stringify(app.frame.getSnapshot())).not.toContain('final fixture outcome');
    expect(() => app.seek(1.5)).toThrow('Authored playback boundary');
    await app.dispose();
});
it('manual clock pause/seek/reset/end/source/dispose are bounded and fence retained callbacks', async () => {
    const app = createPlaybackFixture('unit-context'), initial = app.frame.getSnapshot();
    app.advance();
    expect(app.frame.getSnapshot()).toBe(initial);
    app.play();
    app.advance();
    expect(app.frame.getSnapshot().index).toBe(1);
    app.pause();
    const paused = app.frame.getSnapshot();
    app.advance();
    expect(app.frame.getSnapshot()).toBe(paused);
    app.seek(3);
    const terminal = app.frame.getSnapshot();
    expect(terminal.playing).toBe(false);
    app.play();
    app.advance();
    expect(app.frame.getSnapshot()).toBe(terminal);
    app.reset();
    expect(app.frame.getSnapshot().index).toBe(0);
    expect(app.frame.getSnapshot().epoch).toBeGreaterThan(terminal.epoch);
    app.retireSource();
    expect(app.frame.getSnapshot().sourceKey).toBe('source-1');
    expect(app.frame.getSnapshot().index).toBe(0);
    await app.dispose();
    const retired = app.frame.getSnapshot();
    app.play();
    app.advance();
    app.seek(3);
    app.reset();
    expect(app.frame.getSnapshot()).toBe(retired);
    await app.dispose();
});
