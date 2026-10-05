import type { AdminContentProps, AdminManifest, AdminSettingsRead, AdminTarget } from '@hollis-labs/kit-admin';
import type { SettingsDraft, SettingsWizardCheck, SettingsWizardResult, SettingsWizardIntent, SettingsProvenanceState } from '@hollis-labs/kit-settings';
import { createAdminPresentationSession } from './admin-session.js';
import { store } from './store.js';
/** Explicit app-owned example data. Never inferred from schema defaults; no
 * transport, persistence, resolver, real validation or backend effects. */
export function controlledAdminFixture(contextKey: string, nowMs: number, sourceKey = 'fixture-v1') {
    const session = createAdminPresentationSession(contextKey, sourceKey, ['intent:appearance', 'intent:limits', 'check:appearance', 'check:limits', 'setup']);
    let context = contextKey, source = sourceKey, epoch = 0, disposed = false;
    const held: (() => void)[] = [];
    const receipts = store<readonly string[]>([]);
    const manifest: AdminManifest = { contract_version: 1, app: { id: 'controlled-fixture', label: 'Controlled fixture administration' }, revision: 'reviewed-admin-fixture-v1', settings: [
            { id: 'appearance', label: 'Desired configuration', section: 'settings', scope: { kind: 'environment', id: 'offline' }, schema: { type: 'object', additionalProperties: false, properties: { enabled: { type: 'boolean', title: 'Enabled' }, region: { type: 'string', title: 'Region' }, path: { type: 'string', title: 'Config path', readOnly: true }, mode: { type: 'string', title: 'Mode' } } }, fields: { enabled: { editable: true, secret: false, restart_required: false }, region: { editable: true, secret: false, restart_required: false }, path: { editable: false, secret: false, restart_required: false, read_only_reason: 'Read-only deployment file' }, mode: { editable: true, secret: false, restart_required: true, apply_target: 'fixture-runtime' } }, capabilities: { can_read: true, can_update: true, can_validate: true, can_reset: true } },
            { id: 'limits', label: 'Read-only limits', section: 'settings', schema: { type: 'object', additionalProperties: false, properties: { limit: { type: 'integer', title: 'Limit', readOnly: true } } }, fields: { limit: { editable: false, secret: false, restart_required: false, read_only_reason: 'Review-only resource' } }, capabilities: { can_read: true, can_update: false, can_validate: false, can_reset: false } }
        ], health: [{ id: 'runtime', label: 'Observed runtime', section: 'status', stale_after_ms: 1000 }], stats: [], series: [], diagnostics: [{ id: 'evidence', label: 'Observed diagnostics', section: 'diagnostics', stale_after_ms: 1000, schema: { type: 'object', additionalProperties: false, properties: { fixture: { type: 'boolean' } } } }] };
    function reads(): Record<string, AdminSettingsRead> { return { appearance: { phase: 'ready', state: { values: { enabled: { present: true, value: true, editable: true, has_override: false, source: { kind: 'default', label: 'Reviewed defaults' }, apply_state: 'active' }, region: { present: true, value: 'offline', editable: false, has_override: false, read_only_reason: 'Locked by deployment environment', source: { kind: 'env', label: 'FIXTURE_REGION' }, apply_state: 'active' }, path: { present: true, value: '/fixture/config', editable: false, has_override: false, read_only_reason: 'Read-only deployment file', source: { kind: 'file', label: 'Reviewed config file' }, apply_state: 'active' }, mode: { present: true, value: 'dark', editable: true, has_override: true, source: { kind: 'override', label: 'Fixture override' }, apply_state: 'pending_restart' } }, draft: {}, apply: { restartRequired: true, applyTargets: ['fixture-runtime'] } } }, limits: { phase: 'ready', state: { values: { limit: { present: true, value: 8, editable: false, has_override: false, read_only_reason: 'Review-only resource', source: { kind: 'file', label: 'Reviewed limits file' }, apply_state: 'active' } }, draft: {}, apply: { restartRequired: false, applyTargets: [] } } } }; }
    const state = store<AdminContentProps>(make());
    function update(change: (props: AdminContentProps) => AdminContentProps) { if (!disposed)
        state.set(change(state.getSnapshot())); }
    function make(): AdminContentProps {
        const stamp = epoch;
        const alive = () => !disposed && stamp === epoch && state.getSnapshot().discovery.contextKey === context;
        const active = () => alive() && state.getSnapshot().discovery.phase === 'ready';
        const available = (group: string) => active() && state.getSnapshot().settings?.[group]?.phase === 'ready';
        function patchGroup(group: string, patch: Partial<SettingsProvenanceState>) { update(props => { const read = props.settings?.[group]; if (!read?.state)
            return props; return { ...props, settings: { ...props.settings, [group]: { ...read, state: { ...read.state, ...patch } } } }; }); }
        function intent(group: string, kind: string) { if (!available(group) || group !== 'appearance')
            return; const ticket = session.begin(`intent:${group}`); patchGroup(group, { busy: true, notice: 'Fixture intent pending; no configuration effect', error: undefined }); held.push(() => { ticket.commit(() => { patchGroup(group, { busy: false, notice: `Fixture ${kind} intent reviewed; no changes applied`, error: kind === 'save' ? 'Fixture rejection: no persistence configured' : undefined }); receipts.set([...receipts.getSnapshot(), `Fixture ${kind} outcome only`]); }); }); }
        function draft(group: string, value: SettingsDraft) { if (!available(group) || group !== 'appearance')
            return; session.begin(`intent:${group}`).cancel(); patchGroup(group, { draft: value, busy: false, error: undefined, notice: undefined }); }
        function check(group: string) { if (!available(group))
            return; const ticket = session.begin(`check:${group}`); update(props => ({ ...props, setup: { ...props.setup!, checks: { ...props.setup?.checks, [group]: { status: 'running', blocking: true, message: 'Fixture check pending' } } } })); held.push(() => ticket.commit(() => { update(props => ({ ...props, setup: { ...props.setup!, checks: { ...props.setup?.checks, [group]: { status: 'ok', blocking: true, message: 'Scripted fixture check only' } } } })); })); }
        const checks: Record<string, SettingsWizardCheck> = { appearance: { status: 'idle', blocking: true }, limits: { status: 'idle', blocking: false } };
        return { contextKey: context, nowMs, discovery: { phase: 'ready', contextKey: context, manifest }, selection: { page: 'settings', groupId: 'appearance' }, destination: (target: AdminTarget) => ({ onSelect: () => { if (alive())
                    update(props => ({ ...props, selection: target })); } }), settings: reads(), settingsActions: { onDraftChange: draft, onSave: (group: string) => intent(group, 'save'), onReset: (group: string) => intent(group, 'reset'), onValidate: (group: string) => intent(group, 'validate'), onApply: (group: string) => intent(group, 'apply') }, setup: { step: 0, checks, results: {}, onStepChange: (step: number) => { if (active())
                    update(props => ({ ...props, setup: { ...props.setup!, step } })); }, onCheck: check, onComplete: (plan: readonly SettingsWizardIntent[]) => { if (!active())
                    return; const ticket = session.begin('setup'); update(props => ({ ...props, setup: { ...props.setup!, busy: true } })); held.push(() => ticket.commit(() => { const results: Record<string, SettingsWizardResult> = {}; for (const item of plan)
                    results[item.groupId] = { status: 'failed', message: 'Fixture completion intent only; no save executed' }; update(props => ({ ...props, setup: { ...props.setup!, busy: false, results } })); receipts.set([...receipts.getSnapshot(), 'Fixture setup outcome only']); })); } }, setupContext: 'Fixture setup: host-owned drafts and scripted checks; no provider execution.', observations: { health: { runtime: { status: 'degraded', checks: [], observation: { phase: 'ready', observedAt: new Date(nowMs).toISOString(), nowMs, staleAfterMs: 1000 } } }, diagnostics: { evidence: { data: { fixture: true }, validation: { state: 'valid' }, observation: { phase: 'ready', observedAt: new Date(nowMs).toISOString(), nowMs, staleAfterMs: 1000 } } } } };
    }
    return { state, receipts,
        releaseNext() { held.shift()?.(); },
        select(selection: AdminContentProps['selection']) { update(props => ({ ...props, selection })); },
        scenario(kind: 'ready' | 'initial' | 'refresh' | 'group' | 'observation' | 'readonly' | 'setup' | 'stale') {
            if (disposed)
                return;
            session.reset(context, `${source}:scenario:${++epoch}`);
            receipts.set([]);
            let props = make();
            if (kind === 'initial')
                props = { ...props, discovery: { phase: 'error', contextKey: context, error: 'Fixture initial discovery unavailable' } };
            if (kind === 'refresh')
                props = { ...props, discovery: { ...props.discovery, phase: 'error', error: 'Fixture declaration refresh failed' } };
            if (kind === 'group')
                props = { ...props, settings: { ...props.settings, appearance: { phase: 'error', error: 'Fixture group read unavailable' } } };
            if (kind === 'readonly')
                props = { ...props, settingsActions: undefined, setup: undefined, setupContext: undefined };
            if (kind === 'setup')
                props = { ...props, selection: { page: 'settings', mode: 'setup' } };
            if (kind === 'stale')
                props = { ...props, nowMs: nowMs + 5000, observations: {health: {runtime: {...props.observations!.health!.runtime!, observation: {...props.observations!.health!.runtime!.observation, nowMs: nowMs + 5000}}}, diagnostics: {evidence: {...props.observations!.diagnostics!.evidence!, observation: {...props.observations!.diagnostics!.evidence!.observation, nowMs: nowMs + 5000}}}} };
            if (kind === 'observation')
                props = { ...props, observations: { ...props.observations, health: { runtime: { status: 'degraded', checks: [], observation: { phase: 'error', observedAt: new Date(nowMs).toISOString(), nowMs, staleAfterMs: 1000, error: 'Fixture runtime refresh failed' } } } } };
            state.set(props);
        },
        reset(nextContext: string, nextSource: string) { if (disposed)
            return; if (nextContext === context && nextSource === source)
            return; context = nextContext; source = nextSource; epoch++; session.reset(context, source); receipts.set([]); state.set(make()); },
        dispose() { if (disposed)
            return; disposed = true; epoch++; session.dispose(); held.length = 0; receipts.set([]); state.set({ ...state.getSnapshot(), contextKey: 'retired', discovery: { phase: 'error', contextKey: 'retired', error: 'Fixture source retired' }, settings: undefined, settingsActions: undefined, observations: undefined, setup: undefined }); }
    };
}
