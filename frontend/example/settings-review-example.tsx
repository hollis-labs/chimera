import './settings-review-style.css';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Button } from '@hollis-labs/design-components';
import { SettingsGroupForm, SettingsRenderer, SettingsProvenanceRenderer, SettingsWizard } from '@hollis-labs/kit-settings';
import type { createPlaybackFixture } from './playback-fixture.js';
import { createSettingsReviewFixture, settingsReviewGroups, type SettingsReviewMode } from './settings-review-fixture.js';
import { PlaybackStartup } from './playback-example.js';
export function SettingsReviewProof({ app, retainRetired }: {
    app: ReturnType<typeof createPlaybackFixture>;
    retainRetired: (release: () => void) => void;
}) {
    const [fixture] = useState(() => createSettingsReviewFixture(app)), snapshot = useSyncExternalStore(fixture.state.subscribe, fixture.state.getSnapshot, fixture.state.getSnapshot), callbacks = fixture.capture(), section = useRef<HTMLElement>(null), previous = useRef(snapshot.identity);
    useEffect(() => { const releases = [app.frame.subscribe(fixture.refresh), app.runtime.subscribe(fixture.refresh)]; fixture.refresh(); return () => { releases.forEach(release => release()); retainRetired(fixture.release); fixture.dispose(); }; }, [app, fixture, retainRetired]);
    useEffect(() => {
        if (previous.current === snapshot.identity)
            return;
        previous.current = snapshot.identity;
        const node = section.current?.closest('main')?.querySelector<HTMLElement>('h1'), id = requestAnimationFrame(() => {
            if (fixture.current(snapshot.identity) && fixture.state.getSnapshot().controlEpoch === snapshot.controlEpoch && node?.isConnected)
                node.focus();
        });
        return () => cancelAnimationFrame(id);
    }, [fixture, snapshot.identity, snapshot.controlEpoch]);
    const props = { contractVersion: 1, groups: settingsReviewGroups, states: snapshot.states, readOnlyContext: true, onDraftChange: callbacks.draft };
    return <section ref={section} className="settings-review-proof" aria-label="Controlled settings review"><h2>Local desired-settings review</h2><p>Authored offline fields. No save, reset, apply, connectivity check or provider callbacks. Wizard “Submit setup” requests only a held local plan preview; no configuration is saved or executed.</p><p>Settings lease: {snapshot.identity}</p><p>Cutoff: {new Date(app.frame.getSnapshot().cutoff).toISOString()}. Values are fixed authored configuration, not playback-derived backend receipts.</p>{snapshot.available ? <><nav aria-label="Settings renderer modes">{(['wizard', 'group', 'renderer', 'provenance'] as SettingsReviewMode[]).map(mode => <Button key={mode} aria-pressed={mode === snapshot.mode} onClick={() => callbacks.mode(mode)}>Review {mode}</Button>)}</nav><div className="settings-review-renderer"><p>Presentation-only lab: wizard submission requests a local plan preview. No values are saved.</p>{snapshot.mode === 'wizard' ? <SettingsWizard {...props} step={snapshot.step} onStepChange={callbacks.step} onComplete={callbacks.complete} busy={snapshot.busy}/> : snapshot.mode === 'group' ? <SettingsGroupForm group={settingsReviewGroups[0]} {...snapshot.states.display} readOnlyContext onDraftChange={draft => callbacks.draft('display', draft)} footer={<p>Direct group form; optional save/reset callbacks omitted.</p>}/> : snapshot.mode === 'provenance' ? <SettingsProvenanceRenderer {...props}/> : <SettingsRenderer {...props}/>}</div><nav aria-label="Local settings preview controls"><Button disabled={snapshot.busy} onClick={() => callbacks.preview()}>Hold local draft preview</Button><Button onClick={() => { void app.load('/api/overlay-registry'); }}>Replace settings generation</Button></nav></> : <p>No current settings contribution; drafts and steps retired.</p>}<Button onClick={fixture.release}>Release settings preview producer</Button><p role="status" aria-label="Settings preview outcome">{snapshot.output}</p><p>Draft keys: {Object.entries(snapshot.states).flatMap(([group, state]) => Object.keys(state.draft).map(key => `${group}.${key}`)).join(', ') || 'none'}</p>{snapshot.plan.map(intent => <p key={intent.groupId}>Local preview {intent.groupId}: {JSON.stringify(intent.changes)}</p>)}</section>;
}
export function SettingsReviewStartup() { const retired = useRef<() => void>(() => { }), retain = useRef((release: () => void) => { retired.current = release; }); return <><PlaybackStartup settingsReview retainSettingsProducer={retain.current}/><Button onClick={() => retired.current()}>Release retired settings producer</Button></>; }
