import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Button, FormDialog, ConfirmDialog, OverflowMenu, Input, Textarea } from '@hollis-labs/design-components';
import type { createPlaybackFixture } from './playback-fixture.js';
import { createOverlayFixture } from './overlay-fixture.js';
import { PlaybackStartup } from './playback-example.js';
type App = ReturnType<typeof createPlaybackFixture>;
export function OverlayProof({ app, switchContext, retainRetired, releaseRetired, retire }: {
    app: App;
    switchContext: () => void;
    retainRetired: (release: () => void) => void;
    releaseRetired: () => void;
    retire: () => void;
}) {
    const [fixture] = useState(() => createOverlayFixture(() => { const frame = app.frame.getSnapshot(), view = app.select('operations.detail').find(view => view.ref.owner === 'fake-ops'); return { identity: `${frame.contextKey}/${frame.sourceKey}/${frame.epoch}/${view?.ref.hostInstance ?? 'withdrawn'}/${view?.id ?? 'withdrawn'}/${view?.ref.generation ?? 'none'}`, available: !!view && app.runtime.isCurrent(view) }; }));
    const snapshot = useSyncExternalStore(fixture.state.subscribe, fixture.state.getSnapshot, fixture.state.getSnapshot), callbacks = fixture.capture(), trigger = useRef<HTMLButtonElement>(null), menu = useRef<HTMLSpanElement>(null), section = useRef<HTMLElement>(null), origin = useRef<HTMLElement | null>(null), previous = useRef({ open: false, retirement: 0 }), focusPending = useRef<'heading' | 'origin' | undefined>(undefined);
    useEffect(() => {
        const releases = [app.frame.subscribe(fixture.refresh), app.runtime.subscribe(fixture.refresh)];
        fixture.refresh();
        return () => {
            for (const release of releases)
                release();
            retainRetired(() => fixture.release(true));
            fixture.dispose();
        };
    }, [app, fixture, retainRetired]);
    useEffect(() => {
        const open = snapshot.form || snapshot.confirm, retired = snapshot.retirement !== previous.current.retirement, closed = previous.current.open && !open;
        previous.current = { open, retirement: snapshot.retirement };
        if (retired)
            focusPending.current = 'heading';
        else if (closed && !focusPending.current)
            focusPending.current = 'origin';
        if (!focusPending.current)
            return;
        const destination = focusPending.current, target = destination === 'heading' ? section.current?.closest('main')?.querySelector<HTMLElement>('h1') : (origin.current ?? trigger.current);
        const id = requestAnimationFrame(() => {
            if (fixture.isCurrent(snapshot.identity) && target?.isConnected && !(target instanceof HTMLButtonElement && target.disabled)) {
                target.focus();
                focusPending.current = undefined;
            }
        });
        return () => cancelAnimationFrame(id);
    }, [snapshot.form, snapshot.confirm, snapshot.retirement, snapshot.identity, fixture]);
    function close() { callbacks.close(); }
    function open() { origin.current = trigger.current; callbacks.open(); }
    function menuOpen(confirm = false) {
        origin.current = menu.current?.querySelector('button') ?? trigger.current;
        if (confirm)
            callbacks.confirm();
        else
            callbacks.open();
    }
    return <section ref={section} aria-label="Controlled overlay drafts"><h2>Transient overlay review</h2><p>Drafts and previews are local; no save, authentication or provider effects.</p><Button ref={trigger} disabled={!snapshot.available} onClick={open}>Open local draft</Button>{snapshot.available && <span ref={menu}><OverflowMenu ariaLabel="Draft review actions" actions={[{ label: 'Edit local draft', onSelect: () => menuOpen() }, { label: 'Discard local draft', onSelect: () => menuOpen(true), disabled: !snapshot.draft }, { label: 'Business save unavailable', onSelect: () => { }, disabled: true }]}/></span>}<p role="status" aria-label="Overlay outcome">{snapshot.outcome || 'No local preview'}</p><p>Held overlay producers: {fixture.pending().length}</p><p>Overlay lease: {snapshot.identity}</p><p>Local draft: {snapshot.draft || 'empty'}</p>
 <FormDialog open={snapshot.form} onClose={close} title="Review local draft" description="Intent-only preview; draft remains after success or rejection." onSubmit={() => fixture.submit(callbacks)} submitLabel="Prepare local preview" submitDisabled={!snapshot.draft.trim()} submitting={snapshot.busy}><label htmlFor="overlay-name">Draft label</label><Input id="overlay-name" value={snapshot.draft} onChange={event => callbacks.change(event.target.value)}/><label htmlFor="overlay-note">Review note</label><Textarea id="overlay-note" value={snapshot.note} onChange={event => callbacks.change(snapshot.draft, event.target.value)}/><p role="status">{snapshot.outcome}</p><Button type="button" onClick={() => fixture.release(false)}>Release rejected preview</Button><Button type="button" onClick={() => fixture.release(true)}>Release accepted preview</Button><Button type="button" onClick={() => { app.retireSource(); }}>Retire source from form</Button><Button type="button" onClick={() => { void app.registry.unload('fake-ops'); }}>Withdraw plugin from form</Button><Button type="button" onClick={() => { void app.load('/api/overlay-registry'); }}>Replace owner generation from form</Button><Button type="button" onClick={retire}>Unmount consumer from form</Button><Button type="button" onClick={switchContext}>Replace context from form</Button></FormDialog>
 <ConfirmDialog open={snapshot.confirm} onOpenChange={open => {
            if (!open)
                close();
        }} title="Discard local draft?" description={<span>Only this transient draft is cleared after a local held outcome. <Button onClick={() => fixture.release(false)}>Reject local discard</Button><Button onClick={() => fixture.release(true)}>Release local discard</Button></span>} confirmLabel="Discard transient draft" destructive={false} busy={snapshot.busy} onConfirm={() => fixture.confirm(callbacks)}/>
 <Button onClick={() => { fixture.release(true); releaseRetired(); }}>Release retired overlay producer</Button></section>;
}
export function OverlayStartup() { return <PlaybackStartup overlays/>; }
