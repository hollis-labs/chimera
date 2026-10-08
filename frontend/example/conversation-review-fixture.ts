import { acceptsInput, classifyPriorResponse } from '@hollis-labs/kit-chat';
import type { CardOutcome } from '@hollis-labs/kit-chat';
import { createAdminPresentationSession } from '../src/admin-session.js';
import { store } from '../src/store.js';
import type { createPlaybackFixture } from './playback-fixture.js';
type App = ReturnType<typeof createPlaybackFixture>;
export type ConversationPhase = 'ready' | 'loading' | 'empty' | 'error' | 'denied' | 'locked' | 'long';
export const conversationPriors = ['', 'partial', 'handling', 'submitted', 'canceled', 'cancelled', 'failed', 'error', 'open', 'pending', 'future-status'] as const;
type Intent = {
    kind: 'composer' | 'prompt' | 'confirmation';
    session: string;
    card: string;
    candidate: string | CardOutcome;
    note: string;
};
export function createConversationReviewFixture(app: App) {
    let disposed = false, lease = 0, sessionKey = 'conversation-a', cardKey = 'card-a', prior = '', phase: ConversationPhase = 'ready', finishUI: (() => void) | undefined;
    const pending: (() => void)[] = [], readScope = () => { const frame = app.frame.getSnapshot(), view = app.select('operations.detail').find(view => view.ref.owner === 'fake-ops'); return { identity: `${frame.contextKey}/${frame.sourceKey}/${frame.epoch}/${view?.ref.hostInstance ?? 'withdrawn'}/${view?.id ?? 'withdrawn'}/${view?.ref.generation ?? 'none'}/${sessionKey}/${cardKey}/${prior || 'absent'}/${phase}`, available: !!view && app.runtime.isCurrent(view) }; };
    let scope = readScope();
    const session = createAdminPresentationSession(app.frame.getSnapshot().contextKey, scope.identity, ['inspection']);
    const empty = () => ({ ...scope, controlEpoch: lease, sessionKey, cardKey, prior, phase, selection: 'prompt' as 'prompt' | 'confirmation', draft: '', prompt: '', note: '', streamStep: 0, older: false, busy: false, open: false, intent: null as Intent | null, output: 'No local conversation inspection' });
    const state = store(empty());
    const settle = () => { finishUI?.(); finishUI = undefined; };
    function refresh() { if (disposed)
        return; const next = readScope(); if (next.identity === scope.identity && next.available === scope.available)
        return; scope = next; lease++; settle(); session.reset(app.frame.getSnapshot().contextKey, `${scope.identity}/${scope.available}/${lease}`); state.set(empty()); }
    function change(next: ReturnType<typeof state.getSnapshot>) { lease++; settle(); session.reset(app.frame.getSnapshot().contextKey, `${scope.identity}/${scope.available}/${lease}`); state.set({ ...next, controlEpoch: lease, busy: false, open: false, intent: null, output: 'No local conversation inspection' }); }
    function current(identity: string) { refresh(); return !disposed && scope.identity === identity; }
    const editable = () => scope.available && !['loading', 'error', 'denied', 'locked'].includes(phase);
    const cardEditable = () => editable() && acceptsInput(classifyPriorResponse(prior));
    function eligible(intent: Intent) {
        const live = state.getSnapshot();
        if (!editable() || intent.session !== sessionKey || intent.card !== cardKey || intent.note !== live.note)
            return false;
        if (intent.kind === 'composer')
            return !live.streamStep && typeof intent.candidate === 'string' && !!live.draft.trim() && intent.candidate === live.draft.trim();
        if (!cardEditable() || live.selection !== intent.kind || typeof intent.candidate === 'string')
            return false;
        const candidate = intent.candidate;
        if (candidate.status === 'canceled')
            return Object.keys(candidate).length === 1;
        if (candidate.status !== 'submitted' || candidate.data)
            return false;
        if (intent.kind === 'prompt')
            return !candidate.decisions && candidate.answers?.length === 1 && candidate.answers[0].questionId === `${cardKey}-question` && !!live.prompt.trim() && candidate.answers[0].value === live.prompt.trim() && !candidate.answers[0].note && candidate.answers[0].acceptedSuggestion === undefined;
        return !candidate.answers && candidate.decisions?.length === 1 && [`${cardKey}-inspect`, `${cardKey}-defer`].includes(candidate.decisions[0].action) && candidate.decisions[0].itemId === candidate.decisions[0].action && !candidate.decisions[0].note;
    }
    function capture() {
        const identity = scope.identity, stamp = lease, valid = () => { refresh(); return !disposed && scope.available && scope.identity === identity && lease === stamp; };
        function queue(kind: Intent['kind'], candidate: Intent['candidate']): Promise<void> {
            if (!valid() || state.getSnapshot().busy)
                return Promise.resolve();
            const intent = { kind, session: sessionKey, card: cardKey, candidate: structuredClone(candidate), note: state.getSnapshot().note };
            if (!eligible(intent)) {
                state.set({ ...state.getSnapshot(), output: 'Current draft, prior or policy refuses local inspection' });
                return Promise.resolve();
            }
            const live = state.getSnapshot();
            lease++;
            const heldLease = lease, ticket = session.begin('inspection');
            const ui = new Promise<void>(resolve => { finishUI = resolve; });
            const settleThisUI = finishUI!;
            state.set({ ...live, controlEpoch: lease, busy: true, intent, open: false, output: 'Held local candidate; no send, approval or response mutation' });
            void new Promise<void>(resolve => pending.push(resolve)).then(() => {
                refresh();
                if (disposed || scope.identity !== identity || lease !== heldLease || !scope.available) {
                    ticket.cancel();
                    return;
                }
                if (!eligible(intent)) {
                    ticket.cancel();
                    change(state.getSnapshot());
                    state.set({ ...state.getSnapshot(), output: 'Inspection retired: current draft or policy changed' });
                    return;
                }
                ticket.commit(() => state.set({ ...state.getSnapshot(), busy: false, output: 'Reviewed local candidate only; transcript and prior unchanged' }));
            }).finally(() => { settleThisUI(); if (finishUI === settleThisUI)
                finishUI = undefined; });
            return ui;
        }
        return {
            draft(value: string) { if (valid() && editable())
                change({ ...state.getSnapshot(), draft: value }); },
            prompt(value: string) { if (valid() && cardEditable() && !state.getSnapshot().busy)
                change({ ...state.getSnapshot(), prompt: value }); },
            note(value: string) { if (valid() && editable())
                change({ ...state.getSnapshot(), note: value }); },
            submit(value: string) { return queue('composer', value); },
            respondPrompt(value: CardOutcome) { return queue('prompt', value); }, respondConfirmation(value: CardOutcome) { return queue('confirmation', value); },
            prior(value: string) { if (valid() && conversationPriors.includes(value as typeof conversationPriors[number])) {
                prior = value;
                refresh();
            } },
            phase(value: ConversationPhase) { if (valid()) {
                if (!['ready', 'loading', 'empty', 'error', 'denied', 'locked', 'long'].includes(value))
                    return;
                phase = value;
                refresh();
            } },
            session() { if (valid()) {
                sessionKey = sessionKey === 'conversation-a' ? 'conversation-b' : 'conversation-a';
                refresh();
            } },
            card() { if (valid()) {
                cardKey = cardKey === 'card-a' ? 'card-b' : 'card-a';
                refresh();
            } },
            selection(selection: 'prompt' | 'confirmation') { if (valid())
                change({ ...state.getSnapshot(), selection, prompt: '', note: '' }); },
            step() { if (valid() && editable())
                change({ ...state.getSnapshot(), streamStep: Math.min(2, state.getSnapshot().streamStep + 1) }); },
            stop() { if (valid())
                change({ ...state.getSnapshot(), streamStep: 0 }); },
            history() { if (valid() && phase !== 'denied')
                change({ ...state.getSnapshot(), older: true }); },
            open(open: boolean) { if (!valid() || !state.getSnapshot().intent)
                return; if (open)
                state.set({ ...state.getSnapshot(), open });
            else
                change(state.getSnapshot()); }
        };
    }
    return { state, refresh, current, capture, editable, cardEditable, release() { pending.splice(0).forEach(resolve => resolve()); }, dispose() { if (disposed)
            return; disposed = true; lease++; settle(); session.dispose(); state.set({ ...empty(), available: false }); } };
}
