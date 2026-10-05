import type { ObservationState, HealthSummaryProps, StatCollectionProps, DiagnosticPanelProps } from '@hollis-labs/kit-observe';
import type { SampleSeriesViewProps } from '@hollis-labs/kit-observe/charts';
import { createAdminPresentationSession } from './admin-session.js';
import { store } from './store.js';
const resources = ['health', 'zero', 'missing', 'ratio', 'percent', 'diagnostics', 'series'] as const;
export type ObservationFixtureResource = typeof resources[number];
/** App-owned fixture projection composed exclusively from released kit props.
 * No wire schema, transport, aggregation, persistence or provider reads. */
export interface ObservationFixtureSnapshot {
    readonly contextKey: string;
    readonly sourceKey: string;
    readonly health: HealthSummaryProps;
    readonly stats: StatCollectionProps;
    readonly diagnostics: DiagnosticPanelProps;
    readonly series: SampleSeriesViewProps;
}
export function controlledObservationFixture(contextKey: string, initialNowMs: number, sourceKey = 'observation-v1') {
    if (!Number.isFinite(initialNowMs))
        throw new Error('Finite controlled observation clock required');
    let context = contextKey, source = sourceKey, nowMs = initialNowMs, disposed = false, scenarioRevision = 0;
    const lifetime = createAdminPresentationSession(context, source, resources);
    const held: (() => void)[] = [];
    function observation(age: number): ObservationState { return { phase: 'ready', observedAt: new Date(nowMs - age).toISOString(), nowMs, staleAfterMs: 5000 }; }
    function initial(): ObservationFixtureSnapshot {
        const from = new Date(nowMs - 7000).toISOString(), to = new Date(nowMs - 4000).toISOString();
        return { contextKey: context, sourceKey: source,
            health: { label: 'Fixture process health', status: 'unknown', checks: [{ id: 'provider', label: 'Fixture provider evidence', status: 'unknown', message: 'No healthy result inferred' }], observation: observation(1000) },
            stats: { label: 'Fixture usage measurements', rows: [
                    { id: 'zero', label: 'Completed requests', value: 0, unit: 'count', kind: 'counter', observation: observation(1000) },
                    { id: 'missing', label: 'Missing storage sample', value: null, unit: 'bytes', kind: 'gauge', observation: observation(2000) },
                    { id: 'ratio', label: 'Occupancy ratio', value: 0.5, unit: 'ratio', kind: 'gauge', observation: observation(3000) },
                    { id: 'percent', label: 'Utilization percent', value: 50, unit: 'percent', kind: 'gauge', observation: observation(4000) }
                ] },
            diagnostics: { label: 'Fixture diagnostics', schema: { type: 'object', additionalProperties: false, properties: { fixture: { type: 'boolean' }, sample: { type: 'integer' } } }, data: { fixture: true, sample: 0 }, validation: { state: 'valid' }, observation: observation(3000) },
            series: { label: 'Fixture exact sample history', unit: 'count', kind: 'counter', points: [{ at: from, value: 0 }, { at: new Date(nowMs - 6000).toISOString(), value: null }, { at: new Date(nowMs - 5000).toISOString(), value: 2 }, { at: to, value: 1 }], requested: { from, to, limit: 4 }, bounds: { maxPoints: 4, maxWindowSeconds: 3 }, truncated: false, observation: observation(4000) }
        };
    }
    const state = store<ObservationFixtureSnapshot>(initial());
    function set(value: ObservationFixtureSnapshot) { if (!disposed)
        state.set(value); }
    function mapObservation(input: ObservationFixtureSnapshot, resource: ObservationFixtureResource, change: (value: ObservationState) => ObservationState): ObservationFixtureSnapshot {
        if (resource === 'health')
            return { ...input, health: { ...input.health, observation: change(input.health.observation) } };
        if (resource === 'diagnostics')
            return { ...input, diagnostics: { ...input.diagnostics, observation: change(input.diagnostics.observation) } };
        if (resource === 'series')
            return { ...input, series: { ...input.series, observation: change(input.series.observation) } };
        return { ...input, stats: { ...input.stats, rows: input.stats.rows.map(row => row.id === resource ? { ...row, observation: change(row.observation) } : row) } };
    }
    return { state,
        /** Explicit scripted read; request start preserves last-success evidence/time.
         * Producer deliberately ignores abort until release; actual commit is fenced. */
        refresh(resource: ObservationFixtureResource, outcome: 'success' | 'failure' = 'success') {
            if (disposed)
                return;
            const ticket = lifetime.begin(resource);
            set(mapObservation(state.getSnapshot(), resource, old => ({ ...old, phase: 'loading', error: undefined })));
            held.push(() => {
                ticket.commit(() => {
                    let next = mapObservation(state.getSnapshot(), resource, old => outcome === 'failure' ? { ...old, phase: 'error', error: `Scripted ${resource} refresh failed` } : { ...old, phase: 'ready', error: undefined, observedAt: new Date(nowMs).toISOString(), nowMs });
                    if (outcome === 'success') {
                        if (resource === 'health')
                            next = { ...next, health: { ...next.health, status: 'unhealthy', checks: [{ id: 'provider', label: 'Fixture provider evidence', status: 'unhealthy', message: 'Scripted observation only' }] } };
                        else if (resource === 'diagnostics')
                            next = { ...next, diagnostics: { ...next.diagnostics, data: { fixture: true, sample: 99 } } };
                        else if (resource !== 'series')
                            next = { ...next, stats: { ...next.stats, rows: next.stats.rows.map(row => row.id === resource ? { ...row, value: resource === 'zero' ? 99 : resource === 'missing' ? null : resource === 'ratio' ? 0.25 : 25 } : row) } };
                    }
                    set(next);
                });
            });
        },
        releaseNext() { held.shift()?.(); },
        /** No timer and no request. Every resource receives this app-owned clock. */
        clock(nextNowMs: number) { if (!Number.isFinite(nextNowMs))
            throw new Error('Finite controlled observation clock required'); if (disposed)
            return; nowMs = nextNowMs; let next = state.getSnapshot(); for (const resource of resources)
            next = mapObservation(next, resource, old => ({ ...old, nowMs })); set(next); },
        scenario(kind: 'ready' | 'initial-loading' | 'initial-error' | 'invalid-diagnostics' | 'unsupported-diagnostics' | 'unsupported-series' | 'empty-series' | 'truncated-series' | 'paused') {
            if (disposed)
                return;
            source = `scenario-${kind}-${++scenarioRevision}`;
            lifetime.reset(context, source);
            let next = initial();
            if (kind === 'initial-loading' || kind === 'initial-error')
                for (const resource of resources)
                    next = mapObservation(next, resource, old => ({ ...old, phase: kind === 'initial-loading' ? 'loading' : 'error', observedAt: undefined, error: kind === 'initial-error' ? 'Scripted initial observation failed' : undefined }));
            if (kind === 'invalid-diagnostics' || kind === 'unsupported-diagnostics')
                next = { ...next, diagnostics: { ...next.diagnostics, validation: { state: kind === 'invalid-diagnostics' ? 'invalid' : 'unsupported', messages: ['App rejected this fixture diagnostic projection'] } } };
            if (kind === 'unsupported-series')
                next = { ...next, series: { ...next.series, observation: { ...next.series.observation, supported: false } } };
            if (kind === 'empty-series')
                next = { ...next, series: { ...next.series, points: [] } };
            if (kind === 'truncated-series')
                next = { ...next, series: { ...next.series, truncated: true } };
            if (kind === 'paused')
                for (const resource of resources)
                    next = mapObservation(next, resource, old => ({ ...old, paused: true }));
            set(next);
        },
        reset(nextContext: string, nextSource: string) { if (disposed)
            return; if (context === nextContext && source === nextSource)
            return; context = nextContext; source = nextSource; lifetime.reset(context, source); set(initial()); },
        dispose() { if (disposed)
            return; disposed = true; lifetime.dispose(); held.length = 0; const empty = initial(); let next = empty; for (const resource of resources)
            next = mapObservation(next, resource, old => ({ ...old, phase: 'idle', observedAt: undefined })); state.set({ ...next, contextKey: 'retired', sourceKey: 'retired' }); }
    };
}
