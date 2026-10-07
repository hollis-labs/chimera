import './inspector-style.css';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Button, DetailDialog, JsonViewer, PayloadSummary, MetaList, SearchInput } from '@hollis-labs/design-components';
import type { createPlaybackFixture } from './playback-fixture.js';
import { createInspectorFixture, inspectorRecords } from './inspector-fixture.js';
import { PlaybackStartup } from './playback-example.js';
type App = ReturnType<typeof createPlaybackFixture>;
export function InspectorProof({ app, switchContext, retire }: {
    app: App;
    switchContext: () => void;
    retire: () => void;
}) {
    const [fixture] = useState(() => createInspectorFixture(app)), snapshot = useSyncExternalStore(fixture.state.subscribe, fixture.state.getSnapshot, fixture.state.getSnapshot), callbacks = fixture.capture(), section = useRef<HTMLElement>(null), origin = useRef<HTMLButtonElement>(null), previous = useRef({ open: false, retirement: 0 }), focusPending = useRef<'heading' | 'origin' | undefined>(undefined);
    useEffect(() => { const releases = [app.frame.subscribe(fixture.refresh), app.runtime.subscribe(fixture.refresh)]; fixture.refresh(); return () => { releases.forEach(release => release()); fixture.dispose(); }; }, [app, fixture]);
    useEffect(() => {
        const retired = snapshot.retirement !== previous.current.retirement, closed = previous.current.open && !snapshot.open;
        previous.current = { open: snapshot.open, retirement: snapshot.retirement };
        if (retired)
            focusPending.current = 'heading';
        else if (closed && !focusPending.current)
            focusPending.current = 'origin';
        if (snapshot.open) {
            focusPending.current = undefined;
            return;
        }
        if (!focusPending.current)
            return;
        const controlEpoch = snapshot.controlEpoch;
        const target = focusPending.current === 'heading' ? section.current?.closest('main')?.querySelector<HTMLElement>('h1') : (origin.current ?? section.current?.closest('main')?.querySelector<HTMLElement>('h1')), id = requestAnimationFrame(() => {
            if (fixture.current(snapshot.identity, false) && !fixture.state.getSnapshot().open && fixture.state.getSnapshot().controlEpoch === controlEpoch && target?.isConnected) {
                target.focus();
                focusPending.current = undefined;
            }
        });
        return () => cancelAnimationFrame(id);
    }, [snapshot.identity, snapshot.open, snapshot.retirement, snapshot.available, snapshot.controlEpoch, fixture]);
    const frame = app.frame.getSnapshot(), records = snapshot.available ? inspectorRecords(app).filter(record => record.label.toLowerCase().includes(snapshot.query.toLowerCase())) : [], selected = records.find(record => record.id === snapshot.selected);
    return <section className="inspector-proof" ref={section} aria-label="Controlled payload inspector"><h2>Recorded evidence inspector</h2><p>Cutoff-bounded authored records; errors zero, spend null/uncollected. No copy, download or provider effects.</p>{snapshot.available && <SearchInput key={`${snapshot.identity}:${snapshot.controlEpoch}`} slashToFocus={!snapshot.open && snapshot.available} ariaLabel="Search recorded evidence" value={snapshot.query} onChange={callbacks.search} debounceMs={80}/>}<p role="status" aria-label="Inspector selection">{selected ? selected.label : 'No selected payload'}</p><p>Inspector lease: {snapshot.identity}</p><div className="inspector-columns"><section aria-label="Filtered evidence records">{records.map(record => <article key={record.id}><Button aria-pressed={record.id === snapshot.selected} onClick={() => callbacks.select(record.id)}>Select {record.label}</Button><PayloadSummary raw={record.raw} maxEntries={4}/></article>)}{!records.length && <p>No current matching evidence</p>}</section><section aria-label="Selected evidence detail">{selected ? <><MetaList columns={1} items={[{ label: 'Format', value: selected.format }, { label: 'Source', value: frame.sourceKey }, { label: 'Evidence through', value: new Date(frame.cutoff).toISOString() }, { label: 'Coverage', value: frame.terminal ? 'complete authored fixture' : 'partial recorded prefix' }, { label: 'Spend', value: 'uncollected (null)' }, { label: 'Generation', value: app.select('operations.detail').find(view => view.ref.owner === 'fake-ops')?.ref.generation }]}/><JsonViewer value={selected.format === 'malformed raw fixture' ? selected.raw : selected.payload}/><Button ref={origin} onClick={callbacks.open}>Inspect selected JSON</Button></> : <p>Select a current recorded payload</p>}</section></div>
 <DetailDialog open={snapshot.open && !!selected} onClose={callbacks.close} title="Recorded JSON inspection" meta="Read-only authored payload; no clipboard or download action." footer={<Button onClick={callbacks.close}>Close inspection</Button>}><div className="inspector-modal-body">{selected && <JsonViewer value={selected.format === 'malformed raw fixture' ? selected.raw : selected.payload}/>}<nav aria-label="Inspector lifecycle scenarios"><Button onClick={() => app.retireSource()}>Retire inspector source</Button><Button onClick={() => { void app.load('/api/overlay-registry'); }}>Replace inspector generation</Button><Button onClick={() => { void app.registry.unload('fake-ops'); }}>Withdraw inspector owner</Button><Button onClick={switchContext}>Replace inspector context</Button><Button onClick={retire}>Unmount inspector consumer</Button></nav></div></DetailDialog></section>;
}
export function InspectorStartup() { return <PlaybackStartup inspector/>; }
