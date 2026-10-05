import './playback-style.css';
import { Button } from '@hollis-labs/design-components';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { PluginHostProvider, WidgetRenderer, PluginPanelBody, PluginDeclarativeBody, usePluginAction, usePluginHost } from '@hollis-labs/plugin-host-ui/react';
import type { ContributionView } from '@hollis-labs/plugin-host-ui';
import { createStylesheetLeases } from 'virtual:plugin-host-ui/stylesheets';
import { leasedStylesheets } from '../src/stylesheets.js';
import { createPlaybackFixture } from './playback-fixture.js';
type App = ReturnType<typeof createPlaybackFixture>;
function HeldIntent({ view, epoch }: {
    view: ContributionView;
    epoch: number;
}) {
    const dispatch = usePluginAction(), host = usePluginHost(), [result, setResult] = useState(''), live = useRef(true);
    useEffect(() => { live.current = true; return () => { live.current = false; }; }, [epoch, host]);
    return <PluginDeclarativeBody view={view} render={() => <span><Button onClick={() => {
                setResult('pending');
                void dispatch(view).then(value => {
                    if (live.current && host.isCurrent(view))
                        setResult(value.status);
                });
            }}>Prepare held playback producer</Button><output aria-label="Playback dispatch outcome">{result}</output></span>}/>;
}
function PlaybackViews({ app, switchContext, retire, completePrevious }: {
    app: App;
    switchContext: () => void;
    retire: () => void;
    completePrevious: () => void;
}) {
    useSyncExternalStore(app.runtime.subscribe, app.runtime.getSnapshot, app.runtime.getSnapshot);
    const frame = useSyncExternalStore(app.frame.subscribe, app.frame.getSnapshot, app.frame.getSnapshot), receipts = useSyncExternalStore(app.actions.receipts.subscribe, app.actions.receipts.getSnapshot, app.actions.receipts.getSnapshot);
    const validated = useSyncExternalStore(app.validated.subscribe, app.validated.getSnapshot, app.validated.getSnapshot);
    const intent = app.select('operations.toolbar').find(view => view.ref.key === 'delayed');
    return <main className="playback-proof"><h1>Controlled deterministic playback proof</h1><p>Manual local clock over four authored UTC boundaries. No timer, stream or provider effects.</p><p>Playback context: {frame.contextKey}; source: {frame.sourceKey}</p><nav aria-label="Playback controls"><Button disabled={frame.playing || frame.terminal} onClick={() => app.play()}>Play fixture</Button><Button disabled={!frame.playing} onClick={() => app.pause()}>Pause fixture</Button><Button disabled={!frame.playing || frame.terminal} onClick={() => app.advance()}>Advance fixture clock</Button><Button onClick={() => app.reset()}>Reset playback</Button><Button onClick={() => app.retireSource()}>Retire playback source</Button><Button onClick={switchContext}>Switch playback context</Button><Button onClick={() => { void app.registry.unload('fake-ops'); }}>Unload playback plugin owner</Button><Button onClick={retire}>Unmount playback consumer</Button></nav><label>Authored boundary<input aria-label="Playback boundary" type="range" min="0" max="3" step="1" value={frame.index} onChange={event => app.seek(Number(event.target.value))}/></label><p role="status" aria-label="Playback clock">Frame {frame.index}/3; {new Date(frame.cutoff).toISOString()}; {frame.terminal ? 'ended' : frame.playing ? 'playing' : 'paused'}</p><div className="playback-columns"><section aria-label="Visible playback records"><h2>Records at or before cutoff</h2>{frame.records.map(record => <p key={record.at}>{new Date(record.at).toISOString()} — {record.text}</p>)}{frame.outcome && <p>Recorded outcome: {frame.outcome}</p>}</section><section aria-label="Playback plugin presentation" key={frame.epoch}>{app.select('operations.summary').filter(view => ['summary', 'stable'].includes(view.ref.key)).map(view => <WidgetRenderer key={view.id} widget={view}/>)}{app.select('operations.detail').map(view => <PluginPanelBody key={view.id} panel={view}/>)}{intent && <HeldIntent view={intent} epoch={frame.epoch}/>}</section></div><nav aria-label="Producer release controls"><Button onClick={() => app.complete()}>Release playback producer</Button><Button onClick={completePrevious}>Release retired playback producer</Button></nav><p role="status" aria-label="Validated playback invocation">{validated ? `${validated.contextKey}/${validated.sourceKey}: frame ${validated.index}; ${new Date(validated.cutoff).toISOString()}` : 'No current validated action'}</p><section aria-label="Playback receipts">{receipts.map(receipt => <p key={receipt.id}>Fixture receipt: {receipt.status} {receipt.outcome}</p>)}</section></main>;
}
export function PlaybackStartup() {
    const [app, setApp] = useState<App>(), [error, setError] = useState(''), [retired, setRetired] = useState(false), current = useRef<App | undefined>(undefined), previous = useRef<() => void>(() => { }), serial = useRef(0), mounted = useRef(false), loading = useRef<AbortController | undefined>(undefined), factory = useRef<(key: string) => App>(key => createPlaybackFixture(key)), close = useRef<() => Promise<void>>(async () => { });
    useEffect(() => {
        mounted.current = true;
        const leases = createStylesheetLeases(document), sink = leasedStylesheets(leases, (_key, url) => url === '/plugins/fake-ops/g1/style.css' ? { owner: 'fake-ops', generation: 'g1' } : undefined);
        factory.current = key => createPlaybackFixture(key, sink);
        const next = factory.current('playback-context-a');
        current.current = next;
        setApp(next);
        const controller = new AbortController();
        loading.current = controller;
        void next.load('/plugins/registry', controller.signal).catch(() => {
            if (mounted.current && current.current === next && !controller.signal.aborted)
                setError('Playback registry unavailable');
        });
        close.current = async () => {
            mounted.current = false;
            serial.current++;
            loading.current?.abort();
            const live = current.current;
            current.current = undefined;
            if (live)
                previous.current = live.complete;
            try {
                await live?.dispose();
            }
            finally {
                sink.dispose();
                leases.dispose();
            }
        };
        return () => { void close.current(); };
    }, []);
    async function switchContext() {
        const old = current.current;
        if (!old)
            return;
        current.current = undefined;
        previous.current = old.complete;
        const epoch = ++serial.current;
        loading.current?.abort();
        setApp(undefined);
        await old.dispose();
        if (!mounted.current || epoch !== serial.current)
            return;
        const next = factory.current(`playback-context-${epoch + 1}`);
        current.current = next;
        setApp(next);
        const controller = new AbortController();
        loading.current = controller;
        try {
            await next.load('/plugins/registry', controller.signal);
        }
        catch {
            if (mounted.current && epoch === serial.current)
                setError('Playback registry unavailable');
        }
        finally {
            if (!mounted.current || epoch !== serial.current)
                await next.dispose();
        }
    }
    async function retire() { setRetired(true); setApp(undefined); await close.current(); }
    return retired ? <main className="playback-proof"><h1>Playback consumer retired</h1><p>No plugin presentation or producer outcome remains mounted.</p><Button onClick={() => previous.current()}>Release retired playback producer</Button></main> : error ? <p role="alert">{error}</p> : app ? <PluginHostProvider runtime={app.runtime}><PlaybackViews app={app} switchContext={() => { void switchContext(); }} retire={() => { void retire(); }} completePrevious={() => previous.current()}/></PluginHostProvider> : <p>Loading playback context</p>;
}
