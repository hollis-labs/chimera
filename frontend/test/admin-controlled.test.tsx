import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AdminContent, type AdminContentProps } from '@hollis-labs/kit-admin';
import type { SettingsDraft } from '@hollis-labs/kit-settings';
import { it, expect } from 'vitest';
import { controlledAdminFixture } from '../src/admin-controlled-fixture.js';
type Assert<T extends true> = T;
type IsAny<T> = 0 extends (1 & T) ? true : false;
type KitPropsReallyTyped = Assert<IsAny<AdminContentProps> extends false ? true : false>;
type KitDraftReallyTyped = Assert<IsAny<SettingsDraft> extends false ? true : false>;
const now = Date.parse('2026-10-05T00:00:00Z');
it('renders actual controlled provenance and desired/observed projections', () => { const app = controlledAdminFixture('a', now); const render = () => renderToStaticMarkup(createElement(AdminContent, app.state.getSnapshot())); const settings = render(); for (const label of ['Reviewed defaults', 'FIXTURE_REGION', 'Reviewed config file', 'Fixture override', 'Locked by deployment environment', 'Pending restart'])
    expect(settings).toContain(label); expect(settings).not.toContain('Observed runtime'); app.select({ page: 'status' }); expect(render()).toContain('Observed runtime'); expect(render()).not.toContain('Fixture override'); app.select({ page: 'diagnostics' }); expect(render()).toContain('Observed diagnostics'); app.dispose(); });
it('retired context/source and superseded local intents cannot commit or clear current drafts', () => { for (const retire of ['context', 'source', 'supersede']) {
    const app = controlledAdminFixture('a', now);
    const oldProps=app.state.getSnapshot();const old = oldProps.settingsActions!;
    old.onDraftChange?.('appearance', { mode: { kind: 'value', value: 'light' } });
    old.onSave?.('appearance', { set: { mode: 'light' }, unset: [] });
    if (retire === 'supersede')
        old.onValidate?.('appearance', { set: {}, unset: [] });
    else
        app.reset(retire === 'context' ? 'b' : 'a', retire === 'source' ? 'v2' : 'fixture-v1');
    app.releaseNext();
    expect(app.receipts.getSnapshot()).toEqual([]);
    if (retire !== 'supersede') {
        old.onDraftChange?.('appearance', { mode: { kind: 'value', value: 'old' } });
        old.onSave?.('appearance',{set:{mode:'old'},unset:[]});
        oldProps.setup?.onCheck?.('appearance');
        oldProps.setup?.onComplete([{groupId:'appearance',changes:{set:{mode:'old'},unset:[]}}]);
        oldProps.setup?.onStepChange(2);
        for(let count=0;count<3;count++)app.releaseNext();
        expect(app.receipts.getSnapshot()).toEqual([]);
        expect(app.state.getSnapshot().settings?.appearance?.state?.busy).not.toBe(true);
        expect(app.state.getSnapshot().setup?.checks?.appearance?.status).toBe('idle');
        expect(app.state.getSnapshot().setup?.step).toBe(0);
        expect(app.state.getSnapshot().settings?.appearance?.state?.draft).toEqual({});
    }
    else {
        app.releaseNext();
        expect(app.receipts.getSnapshot()).toEqual(['Fixture validate outcome only']);
        expect(app.state.getSnapshot().settings?.appearance?.state?.draft.mode).toEqual({ kind: 'value', value: 'light' });
    }
    expect(app.state.getSnapshot().settings?.appearance?.state?.values.mode.apply_state).toBe('pending_restart');
    app.dispose();
} });
it('actual initial/refresh/group errors, omission and setup are controlled kit states', () => { const app = controlledAdminFixture('a', now), render = () => renderToStaticMarkup(createElement(AdminContent, app.state.getSnapshot())); app.scenario('initial'); expect(render()).toContain('Fixture initial discovery unavailable'); expect(render()).not.toContain('Fixture override'); app.scenario('refresh'); expect(render()).toContain('Fixture declaration refresh failed'); expect(render()).toContain('Fixture override'); app.scenario('group'); expect(render()).toContain('Fixture group read unavailable'); app.select({ page: 'settings', groupId: 'limits' }); expect(render()).toContain('Reviewed limits file'); app.scenario('readonly'); expect(app.state.getSnapshot().settingsActions).toBeUndefined(); expect(render()).not.toContain('>Save<'); app.scenario('setup'); expect(render()).toContain('Not checked'); app.state.getSnapshot().setup?.onCheck?.('appearance'); app.reset('b', 'v2'); app.releaseNext(); expect(app.state.getSnapshot().setup?.checks?.appearance?.status).toBe('idle'); app.dispose(); app.releaseNext(); expect(render()).not.toContain('Fixture override'); });
