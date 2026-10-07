import type { SettingsGroup, SettingsProvenanceState, SettingsDraft, SettingsWizardIntent } from '@hollis-labs/kit-settings';
import { settingsWizardEvaluation } from '@hollis-labs/kit-settings';
import { createAdminPresentationSession } from '../src/admin-session.js';
import { store } from '../src/store.js';
import type { createPlaybackFixture } from './playback-fixture.js';
type App = ReturnType<typeof createPlaybackFixture>;
export type SettingsReviewMode = 'wizard' | 'group' | 'renderer' | 'provenance';
export const settingsReviewGroups: readonly SettingsGroup[] = [
    { id: 'display', label: 'Authored display settings', schema: { type: 'object', additionalProperties: false, required: ['title', 'count'], properties: { title: { type: 'string', title: 'Review title', minLength: 3, maxLength: 40 }, count: { type: 'integer', title: 'Review count', minimum: 0, maximum: 5 }, secret: { type: 'string', title: 'Credential presence', readOnly: true, writeOnly: true } } }, fields: { title: { editable: true, secret: false, restart_required: true, apply_target: 'fixture-view' }, count: { editable: true, secret: false, restart_required: false }, secret: { editable: false, secret: true, restart_required: false, read_only_reason: 'Presence-only environment fixture' } }, capabilities: { can_read: true, can_update: true, can_validate: true, can_reset: true } },
    { id: 'layout', label: 'Authored layout settings', schema: { type: 'object', additionalProperties: false, properties: { enabled: { type: 'boolean', title: 'Review enabled' }, mode: { type: 'string', title: 'Layout mode', readOnly: true, enum: ['compact', 'expanded'] } } }, fields: { enabled: { editable: true, secret: false, restart_required: false }, mode: { editable: false, secret: false, restart_required: false, read_only_reason: 'Locked by reviewed file' } }, capabilities: { can_read: true, can_update: true, can_validate: true, can_reset: false } }
];
function initialStates(): Record<string, SettingsProvenanceState> {
    return {
        display: { values: { title: { present: true, value: 'Authored fixture', editable: true, has_override: true, source: { kind: 'override', label: 'Local fixture override' }, apply_state: 'pending_restart' }, count: { present: true, value: 0, editable: true, has_override: false, source: { kind: 'default', label: 'Authored default' }, apply_state: 'active' }, secret: { present: true, secret_present: true, editable: false, has_override: false, source: { kind: 'env', label: 'Presence-only fixture' }, apply_state: 'active', read_only_reason: 'No secret collection' } }, draft: {}, apply: { restartRequired: true, applyTargets: ['fixture-view'] } },
        layout: { values: { enabled: { present: true, value: false, editable: true, has_override: false, source: { kind: 'default', label: 'Authored default' }, apply_state: 'active' }, mode: { present: true, value: 'compact', editable: false, has_override: false, source: { kind: 'file', label: 'Reviewed fixture file' }, apply_state: 'active', read_only_reason: 'Locked by reviewed file' } }, draft: {}, apply: { restartRequired: false, applyTargets: [] } }
    };
}
export function createSettingsReviewFixture(app: App) {
    const readScope = () => { const frame = app.frame.getSnapshot(), view = app.select('operations.detail').find(view => view.ref.owner === 'fake-ops'); return { identity: `${frame.contextKey}/${frame.sourceKey}/${frame.epoch}/${view?.ref.hostInstance ?? 'withdrawn'}/${view?.id ?? 'withdrawn'}/${view?.ref.generation ?? 'none'}`, available: !!view && app.runtime.isCurrent(view) }; };
    let scope = readScope(), disposed = false, lease = 0;
    const session = createAdminPresentationSession(app.frame.getSnapshot().contextKey, scope.identity, ['preview']), pending: (() => void)[] = [];
    const empty = () => ({ ...scope, controlEpoch: lease, states: initialStates(), step: 0, mode: 'wizard' as SettingsReviewMode, output: 'No local preview', busy: false, plan: [] as readonly SettingsWizardIntent[] });
    const state = store(empty());
    function refresh() {
        if (disposed)
            return;
        const next = readScope();
        if (next.identity === scope.identity && next.available === scope.available)
            return;
        scope = next;
        lease++;
        session.reset(app.frame.getSnapshot().contextKey, `${scope.identity}/${scope.available}`);
        state.set(empty());
    }
    function current(identity: string) { refresh(); return !disposed && scope.identity === identity; }
    function change(next: ReturnType<typeof state.getSnapshot>) { lease++; session.reset(app.frame.getSnapshot().contextKey, `${scope.identity}/${scope.available}/${lease}`); state.set({ ...next, controlEpoch: lease, busy: false, states: Object.fromEntries(Object.entries(next.states).map(([key, value]) => [key, { ...value, busy: false }])) }); }
    function capture() {
        const identity = scope.identity, stamp = lease;
        const valid = () => { refresh(); return !disposed && scope.available && scope.identity === identity && lease === stamp; };
        return {
            mode(mode: SettingsReviewMode) {
                if (valid())
                    change({ ...state.getSnapshot(), mode, output: 'No local preview', plan: [] });
            },
            draft(groupId: string, draft: SettingsDraft) {
                if (valid() && !state.getSnapshot().busy && settingsReviewGroups.some(group => group.id === groupId)) {
                    const allowed = groupId === 'display' ? ['title', 'count'] : ['enabled'];
                    if (Object.entries(draft).some(([key, edit]) => !allowed.includes(key) || (edit.kind === 'unset' && !state.getSnapshot().states[groupId].values[key]?.has_override)))
                        return;
                    const next = state.getSnapshot();
                    change({ ...next, states: { ...next.states, [groupId]: { ...next.states[groupId], draft } }, output: 'No local preview', plan: [] });
                }
            },
            step(step: number) {
                if (valid() && !state.getSnapshot().busy && Number.isInteger(step) && step >= 0 && step <= settingsReviewGroups.length)
                    change({ ...state.getSnapshot(), step, output: 'No local preview', plan: [] });
            },
            complete(plan: readonly SettingsWizardIntent[]) {
                const live = state.getSnapshot();
                if (valid() && live.mode === 'wizard' && live.step === settingsReviewGroups.length)
                    queue(true, plan);
            },
            preview() { queue(false); }
        };
        function queue(wizard: boolean, supplied?: readonly SettingsWizardIntent[]) {
            if (!valid() || state.getSnapshot().busy)
                return;
            const next = state.getSnapshot(), evaluation = settingsWizardEvaluation(settingsReviewGroups, next.states);
            if (!evaluation.complete || !evaluation.plan.length || (wizard && (next.mode !== 'wizard' || next.step !== settingsReviewGroups.length || JSON.stringify(supplied) !== JSON.stringify(evaluation.plan)))) {
                state.set({ ...next, output: 'No valid changed draft to preview' });
                return;
            }
            lease++;
            const previewLease = lease, ticket = session.begin('preview'), plan = evaluation.plan.map(intent => ({ ...intent, changes: { set: { ...intent.changes.set }, unset: [...intent.changes.unset] } }));
            state.set({ ...next, controlEpoch: lease, busy: true, output: 'Held local preview; no save or execution', states: Object.fromEntries(Object.entries(next.states).map(([key, value]) => [key, { ...value, busy: true }])) });
            void new Promise<void>(resolve => pending.push(resolve)).then(() => {
                refresh();
                const live = state.getSnapshot(), reevaluated = settingsWizardEvaluation(settingsReviewGroups, live.states);
                if (disposed || !scope.available || scope.identity !== identity || lease !== previewLease) {
                    ticket.cancel();
                    return;
                }
                if (!reevaluated.complete || JSON.stringify(reevaluated.plan) !== JSON.stringify(plan) || (wizard && (live.mode !== 'wizard' || live.step !== settingsReviewGroups.length))) {
                    ticket.cancel();
                    change({ ...live, plan: [], output: 'Preview retired: current plan changed' });
                    return;
                }
                ticket.commit(() => { lease++; const live = state.getSnapshot(); state.set({ ...live, controlEpoch: lease, busy: false, plan, output: 'Local plan preview only; values and drafts unchanged', states: Object.fromEntries(Object.entries(live.states).map(([key, value]) => [key, { ...value, busy: false }])) }); });
            });
        }
    }
    return { state, refresh, current, capture, release() {
            for (const resolve of pending.splice(0))
                resolve();
        }, dispose() {
            if (disposed)
                return;
            disposed = true;
            session.dispose();
            lease++;
            state.set({ ...empty(), available: false });
        } };
}
