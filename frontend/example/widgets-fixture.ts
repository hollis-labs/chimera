import { store } from '../src/store.js';
import type { createPlaybackFixture } from './playback-fixture.js';
type App = ReturnType<typeof createPlaybackFixture>;
export function widgetEvidence(app: App) {
    const frame = app.frame.getSnapshot();
    const primary = [0, 2, 1, 3].slice(0, frame.index + 1), secondary = [0, 1, 0, 2].slice(0, frame.index + 1);
    return { frame, primary, secondary, peak: Math.max(...primary.map((value, index) => value + secondary[index])), records: [...frame.records].reverse(), segments: [{ key: 'pending', label: 'Nonterminal records', color: 'var(--color-info)', value: frame.records.length - (frame.terminal ? 1 : 0) }, { key: 'terminal', label: 'Terminal records', color: 'var(--color-success)', value: frame.terminal ? 1 : 0 }] };
}
/** Private fixture policy; actual shared runtime remains contribution authority. */
export function createWidgetsFixture(app: App) {
    const readScope = () => { const frame = app.frame.getSnapshot(), view = app.select('operations.detail').find(view => view.ref.owner === 'fake-ops'); return { identity: `${frame.contextKey}/${frame.sourceKey}/${frame.epoch}/${view?.ref.hostInstance ?? 'withdrawn'}/${view?.id ?? 'withdrawn'}/${view?.ref.generation ?? 'none'}`, available: !!view && app.runtime.isCurrent(view) }; };
    let scope = readScope(), disposed = false, lease = 0;
    const empty = () => ({ ...scope, signal: 'both' as 'both' | 'primary', selected: undefined as number | undefined, compact: false });
    const state = store(empty());
    function refresh() { if (disposed)
        return; const next = readScope(); if (next.identity === scope.identity && next.available === scope.available)
        return; scope = next; lease++; state.set(empty()); }
    function capture() {
        const identity = scope.identity, stamp = lease;
        const valid = () => { refresh(); return !disposed && scope.available && scope.identity === identity && stamp === lease; };
        return {
            signal(value: 'both' | 'primary') { if (valid()) {
                lease++;
                state.set({ ...state.getSnapshot(), signal: value });
            } },
            select(at: number) { if (valid() && widgetEvidence(app).records.some(record => record.at === at)) {
                lease++;
                state.set({ ...state.getSnapshot(), selected: at });
            } },
            layout() { if (valid()) {
                lease++;
                state.set({ ...state.getSnapshot(), compact: !state.getSnapshot().compact });
            } }
        };
    }
    return { state, refresh, capture, dispose() { if (disposed)
            return; disposed = true; lease++; state.set({ ...empty(), available: false }); } };
}
