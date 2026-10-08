import type { AccountProfileValue, ApiTokenDraft, ApiTokenRecord, ConnectedAccount, AccountIdentity, ApiTokenScope } from '@hollis-labs/kit-account';
import { createAdminPresentationSession } from '../src/admin-session.js';
import { store } from '../src/store.js';
import type { createPlaybackFixture } from './playback-fixture.js';
type App = ReturnType<typeof createPlaybackFixture>;
export type AccountScenario = 'ready' | 'unknown' | 'loading' | 'error' | 'denied' | 'read-only' | 'empty' | 'long' | 'busy';
export type AccountMode = 'profile' | 'metadata';
export type AccountSnapshot = {
    principal: string;
    identity: AccountIdentity;
    profile: AccountProfileValue;
    tokens: readonly ApiTokenRecord[];
    accounts: readonly ConnectedAccount[];
    scopes: readonly ApiTokenScope[];
    allowed: boolean;
    readOnly: boolean;
    loading: boolean;
    busy: boolean;
    error?: string;
};
export function authoredAccountSnapshot(scenario: AccountScenario, principal = 'A'): AccountSnapshot {
    const long = scenario === 'long' ? 'Authored long fictional metadata '.repeat(9) : '';
    return { principal, identity: scenario === 'unknown' ? { state: 'unknown' } : scenario === 'loading' ? { state: 'loading' } : scenario === 'error' ? { state: 'error', message: 'Authored identity unavailable' } : { state: 'identified', displayName: `Fictional principal ${principal}`, source: 'Offline authored fixture', assurance: 'local' }, profile: { displayName: long || `Editable reviewer ${principal}`, email: 'reviewer@example.invalid' }, scopes: [{ id: 'review', label: 'Review metadata', description: 'Authored scope label; no grant evaluation' }, { id: 'inspect', label: 'Inspect fixture' }], tokens: scenario === 'empty' ? [] : [{ id: 'active', name: long || 'Fictional active metadata', scopes: ['review'], status: 'active', canRevoke: true, detail: 'No token value exists' }, { id: 'unknown', name: 'Unknown token status', scopes: [], status: 'unreported', canRevoke: true, detail: 'Unknown is not active' }], accounts: scenario === 'empty' ? [] : [{ id: 'disconnected', provider: long || 'Offline provider alpha', status: 'disconnected', canConnect: true, canDisconnect: false }, { id: 'connected', provider: 'Offline provider beta', status: 'connected', accountLabel: 'Fictional association', canConnect: false, canDisconnect: true }, { id: 'unknown', provider: 'Unknown provider status', status: 'unreported', canConnect: true, canDisconnect: true }], allowed: scenario !== 'denied', readOnly: scenario === 'read-only', loading: scenario === 'loading', busy: scenario === 'busy', error: scenario === 'error' ? 'Authored resource failure; no successful data inferred' : undefined };
}
// Mirrors optional HTML type=email syntax, including a@b; this is not identity verification.
export function validProfile(value: AccountProfileValue) { return !!value.displayName.trim() && (!value.email || /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/.test(value.email)); }
type Intent = {
    kind: 'profile' | 'preferences' | 'create' | 'revoke' | 'connect' | 'disconnect';
    principal: string;
    candidate: unknown;
};
export function createAccountReviewFixture(app: App, readExternal?: () => AccountSnapshot) {
    let scenario: AccountScenario = 'ready', principal = 'A', disposed = false, lease = 0;
    const authored = () => readExternal?.() ?? authoredAccountSnapshot(scenario, principal);
    const readScope = () => { const frame = app.frame.getSnapshot(), view = app.select('operations.detail').find(view => view.ref.owner === 'fake-ops'); return { identity: `${frame.contextKey}/${frame.sourceKey}/${frame.epoch}/${view?.ref.hostInstance ?? 'withdrawn'}/${view?.id ?? 'withdrawn'}/${view?.ref.generation ?? 'none'}/${scenario}/${authored().principal}`, available: !!view && app.runtime.isCurrent(view) }; };
    let scope = readScope();
    const session = createAdminPresentationSession(app.frame.getSnapshot().contextKey, scope.identity, ['inspection']), pending: (() => void)[] = [];
    const empty = () => ({ ...scope, controlEpoch: lease, scenario, mode: 'profile' as AccountMode, profile: { ...authored().profile }, preferences: { compact: false }, draft: { name: '', scopes: [] } as ApiTokenDraft, target: null as string | null, busy: false, open: false, intent: null as Intent | null, output: 'No local candidate inspection' });
    const state = store(empty());
    function refresh() { if (disposed)
        return; const next = readScope(); if (next.identity === scope.identity && next.available === scope.available)
        return; scope = next; lease++; session.reset(app.frame.getSnapshot().contextKey, `${scope.identity}/${scope.available}/${lease}`); state.set(empty()); }
    function change(next: ReturnType<typeof state.getSnapshot>, target: string | null = null) { lease++; session.reset(app.frame.getSnapshot().contextKey, `${scope.identity}/${scope.available}/${lease}`); state.set({ ...next, controlEpoch: lease, target, busy: false, intent: null, open: false, output: 'No local candidate inspection' }); }
    function current(identity: string) { refresh(); return !disposed && scope.identity === identity; }
    const editable = () => { const snapshot = authored(); return scope.available && snapshot.identity.state === 'identified' && snapshot.allowed && !snapshot.readOnly && !snapshot.loading && !snapshot.busy && !snapshot.error; };
    const validDraft = (draft: ApiTokenDraft) => !!draft.name.trim() && draft.scopes.length > 0 && new Set(draft.scopes).size === draft.scopes.length && draft.scopes.every(id => authored().scopes.some(scope => scope.id === id));
    function eligible(intent: Intent) { const live = state.getSnapshot(), snapshot = authored(); if (!editable() || intent.principal !== snapshot.principal)
        return false; switch (intent.kind) {
        case 'profile': return validProfile(live.profile) && JSON.stringify(live.profile) === JSON.stringify(intent.candidate);
        case 'preferences': return JSON.stringify(live.preferences) === JSON.stringify(intent.candidate);
        case 'create': return validDraft(live.draft) && JSON.stringify(live.draft) === JSON.stringify(intent.candidate);
        case 'revoke': return snapshot.tokens.some(token => token.id === intent.candidate && token.status === 'active' && token.canRevoke);
        case 'connect': return snapshot.accounts.some(account => account.id === intent.candidate && account.canConnect && ['disconnected', 'error'].includes(account.status));
        case 'disconnect': return snapshot.accounts.some(account => account.id === intent.candidate && account.canDisconnect && ['connected', 'error'].includes(account.status));
    } }
    function capture() {
        const identity = scope.identity, stamp = lease;
        const valid = () => { refresh(); return !disposed && scope.available && scope.identity === identity && lease === stamp; };
        function queue(kind: Intent['kind'], candidate: unknown) {
            if (!valid() || state.getSnapshot().busy)
                return;
            const intent = { kind, principal: authored().principal, candidate: structuredClone(candidate) };
            if (!eligible(intent)) {
                state.set({ ...state.getSnapshot(), output: 'Current draft or policy does not admit local inspection' });
                return;
            }
            const next = state.getSnapshot();
            lease++;
            const heldLease = lease, ticket = session.begin('inspection');
            state.set({ ...next, controlEpoch: lease, target: null, intent, busy: true, open: false, output: 'Held local candidate; no account effects' });
            void new Promise<void>(resolve => pending.push(resolve)).then(() => {
                refresh();
                if (disposed || scope.identity !== identity || lease !== heldLease || !scope.available) {
                    ticket.cancel();
                    return;
                }
                if (!eligible(intent)) {
                    ticket.cancel();
                    change(state.getSnapshot());
                    state.set({ ...state.getSnapshot(), output: 'Inspection retired: current metadata or policy changed' });
                    return;
                }
                ticket.commit(() => state.set({ ...state.getSnapshot(), busy: false, output: 'Reviewed local candidate only; supplied metadata unchanged' }));
            });
        }
        return {
            mode(mode: AccountMode) { if (valid())
                change({ ...state.getSnapshot(), mode }); },
            scenario(next: AccountScenario) { if (!valid())
                return; scenario = next; refresh(); },
            principal() { if (!valid())
                return; principal = principal === 'A' ? 'B' : 'A'; refresh(); },
            profile(value: AccountProfileValue) { if (valid() && editable() && !state.getSnapshot().busy)
                change({ ...state.getSnapshot(), profile: { ...value } }); },
            preferences(compact: boolean) { if (valid() && editable() && !state.getSnapshot().busy)
                change({ ...state.getSnapshot(), preferences: { compact } }); },
            draft(draft: ApiTokenDraft) { if (valid() && editable() && !state.getSnapshot().busy)
                change({ ...state.getSnapshot(), draft: { name: draft.name, scopes: [...draft.scopes] } }); },
            saveProfile(value: AccountProfileValue) { queue('profile', value); },
            savePreferences() { queue('preferences', state.getSnapshot().preferences); },
            create(draft: ApiTokenDraft) { queue('create', draft); },
            target(id: string | null) { if (valid() && !state.getSnapshot().busy && (id === null || (editable() && authored().tokens.some(token => token.id === id && token.status === 'active' && token.canRevoke))))
                change(state.getSnapshot(), id); },
            revoke(id: string) { if (valid() && state.getSnapshot().target === id)
                queue('revoke', id); },
            connect(id: string) { queue('connect', id); }, disconnect(id: string) { queue('disconnect', id); },
            open(open: boolean) { if (!valid() || !state.getSnapshot().intent)
                return; if (open)
                state.set({ ...state.getSnapshot(), open });
            else
                change(state.getSnapshot()); }
        };
    }
    return { state, refresh, current, capture, authored, editable, validDraft, release() { pending.splice(0).forEach(resolve => resolve()); }, dispose() { if (disposed)
            return; disposed = true; session.dispose(); lease++; state.set({ ...empty(), available: false }); } };
}
