import { store } from '../src/store.js';
import type { createPlaybackFixture } from './playback-fixture.js';
type App = ReturnType<typeof createPlaybackFixture>;
/** App-only read-only records, never a wire validator or business executor. */
export function inspectorRecords(app: App) { const frame = app.frame.getSnapshot(); return frame.records.map((record, index) => ({ id: String(record.at), label: record.text, payload: { source: frame.sourceKey, recordedAt: new Date(record.at).toISOString(), text: record.text, errors: 0, spend: null, ...(record.at === frame.cutoff && frame.outcome ? { outcome: frame.outcome } : {}) }, format: index === 1 ? 'malformed raw fixture' : 'JSON fixture' })).map(record => ({ ...record, raw: record.format === 'malformed raw fixture' ? '[{fixture truncated' : JSON.stringify(record.payload) })); }
export function createInspectorFixture(app: App) {
    const readScope = () => { const frame = app.frame.getSnapshot(), view = app.select('operations.detail').find(view => view.ref.owner === 'fake-ops'); return { identity: `${frame.contextKey}/${frame.sourceKey}/${frame.epoch}/${view?.ref.hostInstance ?? 'withdrawn'}/${view?.id ?? 'withdrawn'}/${view?.ref.generation ?? 'none'}`, available: !!view && app.runtime.isCurrent(view) }; };
    let scope = readScope(), disposed = false, lease = 0;
    const empty = () => ({ identity: scope.identity, available: scope.available, query: '', selected: undefined as string | undefined, open: false, retirement: 0, controlEpoch: lease });
    const state = store(empty());
    function refresh() {
        if (disposed)
            return;
        const next = readScope();
        if (next.identity === scope.identity && next.available === scope.available)
            return;
        const previous = state.getSnapshot();
        scope = next;
        lease++;
        state.set({ ...empty(), retirement: previous.retirement + (previous.open ? 1 : 0) });
    }
    function current(identity: string, requireAvailable = true) { refresh(); return !disposed && (!requireAvailable || scope.available) && scope.identity === identity; }
    function capture() {
        const identity = scope.identity, stamp = lease;
        const valid = () => current(identity) && stamp === lease;
        return {
            search(query: string) {
                if (!valid() || state.getSnapshot().open)
                    return;
                const snapshot = state.getSnapshot(), records = inspectorRecords(app).filter(record => record.label.toLowerCase().includes(query.toLowerCase()));
                const selected = records.some(record => record.id === snapshot.selected) ? snapshot.selected : undefined;
                lease++;
                state.set({ ...snapshot, query, selected, open: false });
            },
            select(id: string) {
                if (valid() && inspectorRecords(app).some(record => record.id === id)) {
                    lease++;
                    state.set({ ...state.getSnapshot(), selected: id, open: false, controlEpoch: lease });
                }
            },
            open() {
                if (valid() && state.getSnapshot().selected) {
                    lease++;
                    state.set({ ...state.getSnapshot(), open: true, controlEpoch: lease });
                }
            },
            close() {
                if (valid()) {
                    lease++;
                    state.set({ ...state.getSnapshot(), open: false, controlEpoch: lease });
                }
            }
        };
    }
    return { state, refresh, capture, current, dispose() {
            if (disposed)
                return;
            disposed = true;
            state.set(empty());
        } };
}
