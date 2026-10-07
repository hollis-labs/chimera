import { createAdminPresentationSession, type AdminPresentationTicket } from '../src/admin-session.js';
import { store } from '../src/store.js';
/** App-only transient form policy. Scope reads the actual admitted contribution. */
export function createOverlayFixture(readScope: () => {
    identity: string;
    available: boolean;
}) {
    let scope = readScope(), lease = 0, disposed = false, active: AdminPresentationTicket | undefined;
    const session = createAdminPresentationSession('overlay-proof', scope.identity, ['preview', 'discard']);
    const empty = () => ({ identity: scope.identity, available: scope.available, draft: '', note: '', form: false, confirm: false, busy: false, outcome: '', retirement: 0 });
    const state = store(empty());
    const producers: Array<{
        resolve: () => void;
        signal: AbortSignal;
    }> = [];
    function cancel() { lease++; active?.cancel(); active = undefined; }
    function refresh() {
        if (disposed)
            return;
        const next = readScope();
        if (next.identity === scope.identity && next.available === scope.available)
            return;
        const old = state.getSnapshot();
        cancel();
        scope = next;
        session.reset('overlay-proof', scope.identity);
        state.set({ ...empty(), retirement: old.retirement + (old.form || old.confirm ? 1 : 0) });
    }
    function produce(kind: 'preview' | 'discard') {
        const current = state.getSnapshot();
        if (current.busy || !current.draft.trim() || !(kind === 'preview' ? current.form : current.confirm))
            return;
        active = session.begin(kind);
        const ticket = active, draft = current.draft;
        state.set({ ...current, busy: true, outcome: 'Held local ' + kind });
        let accepted = false;
        void new Promise<void>(resolve => producers.push({ resolve, signal: ticket.signal })).then(() => { refresh(); return ticket.commit(() => { active = undefined; const current = state.getSnapshot(); state.set(kind === 'discard' && accepted ? { ...empty(), retirement: current.retirement } : { ...current, busy: false, outcome: accepted ? `Local preview: ${draft}` : 'Preview rejected; draft retained' }); }); });
        return (value: boolean) => { accepted = value; };
    }
    function capture() {
        const stamp = lease;
        const valid = () => { refresh(); return !disposed && stamp === lease && scope.available; };
        return {
            open() {
                if (valid())
                    state.set({ ...state.getSnapshot(), form: true, outcome: '' });
            },
            confirm() {
                if (valid())
                    state.set({ ...state.getSnapshot(), form: false, confirm: true });
            },
            change(draft: string, note = state.getSnapshot().note) {
                if (!valid())
                    return;
                cancel();
                state.set({ ...state.getSnapshot(), draft, note, busy: false, outcome: '' });
            },
            close() {
                if (!valid())
                    return;
                cancel();
                state.set({ ...state.getSnapshot(), form: false, confirm: false, busy: false, outcome: '' });
            },
            discard() {
                if (!valid() || state.getSnapshot().busy)
                    return;
                cancel();
                state.set({ ...empty(), retirement: state.getSnapshot().retirement });
            },
            submit() {
                if (valid())
                    return produce('preview');
            },
            prepareDiscard() {
                if (valid())
                    return produce('discard');
            }
        };
    }
    let setAccepted: ((value: boolean) => void) | undefined;
    return { state, refresh, capture, isCurrent(identity: string) { refresh(); return !disposed && scope.identity === identity; }, submit(callback: ReturnType<typeof capture>) {
            const next = callback.submit();
            if (next)
                setAccepted = next;
        }, confirm(callback: ReturnType<typeof capture>) {
            const next = callback.prepareDiscard();
            if (next)
                setAccepted = next;
        }, release(accepted: boolean) {
            setAccepted?.(accepted);
            setAccepted = undefined;
            for (const pending of producers.splice(0))
                pending.resolve();
        }, pending() { return producers.map(value => value.signal); }, dispose() {
            if (disposed)
                return;
            disposed = true;
            cancel();
            session.dispose();
            state.set(empty());
        } };
}
