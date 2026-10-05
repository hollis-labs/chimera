import { it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { HealthSummary, StatCollection, DiagnosticPanel, type ObservationState } from '@hollis-labs/kit-observe';
import { SampleSeriesView, type SampleSeriesViewProps } from '@hollis-labs/kit-observe/charts';
import { controlledObservationFixture } from '../src/observation-fixture.js';
type Assert<T extends true> = T;
type IsAny<T> = 0 extends (1 & T) ? true : false;
type ObserveTyped = Assert<IsAny<ObservationState> extends false ? true : false>;
type SeriesTyped = Assert<IsAny<SampleSeriesViewProps> extends false ? true : false>;
const now = Date.parse('2026-10-05T00:00:00Z');
it('actual root/chart owners render explicit zero/null/unknown, units and exact bounded sample gaps', () => {
    const app = controlledObservationFixture('a', now), snapshot = app.state.getSnapshot();
    expect(snapshot.stats.rows.map(row => [row.value, row.unit, row.kind])).toEqual([[0, 'count', 'counter'], [null, 'bytes', 'gauge'], [0.5, 'ratio', 'gauge'], [50, 'percent', 'gauge']]);
    expect(new Set(snapshot.stats.rows.map(row => row.observation))).toHaveLength(4);
    expect(renderToStaticMarkup(createElement(HealthSummary, snapshot.health))).toContain('unknown');
    expect(renderToStaticMarkup(createElement(StatCollection, snapshot.stats))).toContain('Missing sample');
    expect(renderToStaticMarkup(createElement(StatCollection, snapshot.stats))).toContain('cumulative counter');
    const series = renderToStaticMarkup(createElement(SampleSeriesView, snapshot.series));
    expect(series).toContain('Resource bounds:');
    expect(series).toContain('No sample');
    expect(series).toContain('2026-10-04T23:59:54.000Z');
    expect(snapshot.series.points.every(point => Date.parse(point.at) <= Date.parse(snapshot.series.observation.observedAt!))).toBe(true);
    expect(Date.parse(snapshot.series.observation.observedAt!)).toBeLessThanOrEqual(snapshot.series.observation.nowMs);
    expect(snapshot.series.points.map(point => point.value)).toEqual([0, null, 2, 1]);
    expect(snapshot.series.points).toHaveLength(snapshot.series.bounds.maxPoints);
    expect(Date.parse(snapshot.series.requested.to) - Date.parse(snapshot.series.requested.from)).toBeLessThanOrEqual(snapshot.series.bounds.maxWindowSeconds * 1000);
    app.dispose();
});
it('retains last-success timestamps and payload during held refresh/failure without contaminating siblings', () => {
    const app = controlledObservationFixture('a', now), original = app.state.getSnapshot();
    app.refresh('zero', 'failure');
    const pending = app.state.getSnapshot();
    expect(pending.stats.rows[0].observation.phase).toBe('loading');
    expect(pending.stats.rows[0].observation.observedAt).toBe(original.stats.rows[0].observation.observedAt);
    expect(pending.health).toBe(original.health);
    app.clock(now + 10000);
    app.releaseNext();
    const failed = app.state.getSnapshot();
    expect(failed.stats.rows[0].value).toBe(0);
    expect(failed.stats.rows[0].observation.observedAt).toBe(original.stats.rows[0].observation.observedAt);
    expect(failed.stats.rows[0].observation.phase).toBe('error');
    expect(failed.stats.rows[1].observation.phase).toBe('ready');
    app.refresh('zero');
    app.releaseNext();
    expect(app.state.getSnapshot().stats.rows[0].observation.observedAt).toBe(new Date(now + 10000).toISOString());
    app.dispose();
});
it('held producers ignoring abort are fenced on latest request, context, source and disposal', () => {
    for (const retirement of ['supersede', 'context', 'source', 'dispose']) {
        const app = controlledObservationFixture('a', now);
        app.refresh('zero');
        app.refresh('health');
        if (retirement === 'supersede')
            app.refresh('zero', 'failure');
        else if (retirement === 'dispose')
            app.dispose();
        else
            app.reset(retirement === 'context' ? 'b' : 'a', retirement === 'source' ? 'v2' : 'observation-v1');
        app.releaseNext();
        expect(app.state.getSnapshot().stats.rows[0].value).toBe(0);
        app.releaseNext();
        if (retirement === 'supersede') {
            expect(app.state.getSnapshot().health.status).toBe('unhealthy');
            app.releaseNext();
            expect(app.state.getSnapshot().stats.rows[0].observation.phase).toBe('error');
        }
        else
            expect(app.state.getSnapshot().health.status).toBe('unknown');
        app.dispose();
        app.dispose();
    }
});
it('initial failures withhold fabricated evidence and diagnostics require app-approved validation', () => {
    const app = controlledObservationFixture('a', now), render = () => renderToStaticMarkup(createElement(StatCollection, app.state.getSnapshot().stats));
    app.scenario('initial-error');
    expect(render()).toContain('Scripted initial observation failed');
    expect(render()).not.toContain('cumulative counter');
    expect(app.state.getSnapshot().health.observation.observedAt).toBeUndefined();
    app.scenario('invalid-diagnostics');
    const invalid = renderToStaticMarkup(createElement(DiagnosticPanel, app.state.getSnapshot().diagnostics));
    expect(invalid).toContain('App rejected this fixture diagnostic projection');
    expect(invalid).not.toContain('Copy');
    app.scenario('empty-series');
    expect(renderToStaticMarkup(createElement(SampleSeriesView, app.state.getSnapshot().series))).toContain('No samples in requested range');
    expect(() => app.clock(Infinity)).toThrow();
    app.dispose();
});
