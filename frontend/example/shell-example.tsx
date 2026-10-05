import './shell-style.css';
import { AppShell, DetailPageLayout, OverlaySidebar, Button } from '@hollis-labs/design-components';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { PluginHostProvider, WidgetRenderer, PluginPanelBody, PluginDeclarativeBody, usePluginAction } from '@hollis-labs/plugin-host-ui/react';
import type { ContributionView } from '@hollis-labs/plugin-host-ui';
import { createRoutingExample } from '../src/routing-example.js';
import { createStylesheetLeases } from 'virtual:plugin-host-ui/stylesheets';
import { leasedStylesheets } from '../src/stylesheets.js';
type App = ReturnType<typeof createRoutingExample>;
function PluginNavigation({ view }: {
    view: ContributionView;
}) { const dispatch = usePluginAction(); return <PluginDeclarativeBody view={view} render={() => <Button onClick={() => { void dispatch(view); }}>{view.label}</Button>}/>; }
function ShellViews({ app, switchContext }: {
    app: App;
    switchContext: () => void;
}) {
    useSyncExternalStore(app.runtime.subscribe, app.runtime.getSnapshot, app.runtime.getSnapshot);
    const layout = app.layouts.get('operations.summary')!;
    useSyncExternalStore(layout.subscribe, layout.getSnapshot, layout.getSnapshot);
    const route = useSyncExternalStore(app.navigation.subscribe, app.navigation.getSnapshot, app.navigation.getSnapshot);
    const [mode, setMode] = useState<'stack' | 'grid'>('stack'), [overlay, setOverlay] = useState(false), [panel, setPanel] = useState(true);
    const heading = useRef<HTMLHeadingElement>(null), scroll = useRef<HTMLDivElement>(null);
    useEffect(() => {
        setOverlay(false);
        setPanel(true);
        if (scroll.current)
            scroll.current.scrollTop = 0;
    }, [route]);
    const widgets = app.select('operations.summary').filter(view => ['summary', 'stable'].includes(view.ref.key)), panels = app.select('operations.detail');
    function navigation(label: string) { return <nav aria-label={label} className="shell-navigation">{app.routes.map(item => <Button key={item.id} aria-current={route === item.id ? 'page' : undefined} onClick={() => app.navigation.set(item.id)}>{item.label}</Button>)}{app.select('operations.nav').map(view => <PluginNavigation key={view.id} view={view}/>)}</nav>; }
    function visibility(show: boolean) {
        const prefs = layout.getSnapshot(), summary = app.runtime.getSnapshot().views.find(view => view.ref.key === 'summary');
        if (summary)
            layout.save({ ...prefs, visibility: { ...prefs.visibility, [summary.id]: show } });
    }
    const header = <header className="shell-header"><h1>Controlled shell composition</h1><span>Shell context: {app.contextKey}</span><a href="#shell-view-title" onClick={event => { event.preventDefault(); heading.current?.focus(); }}>Skip to shell content</a><Button onClick={switchContext}>Switch shell context</Button><div className="md:hidden"><OverlaySidebar open={overlay} onOpenChange={setOverlay} trigger={<Button>Open shell navigation</Button>} title="Shell navigation" description="Application-owned destinations">{navigation('Overlay shell navigation')}</OverlaySidebar></div></header>;
    return <AppShell nav={<aside aria-label="Desktop shell navigation" className="shell-rail">{navigation('Desktop destinations')}</aside>} header={header}><DetailPageLayout scrollRef={scroll} header={<div className="shell-view-header"><h2 id="shell-view-title" ref={heading} tabIndex={-1}>Selected shell view: {route}</h2><p>Layout mode: {mode}; local presentation only.</p></div>}><div className="shell-scroll-content" data-shell-scroll-content><section aria-label="Shell layout controls"><Button onClick={() => setMode(mode === 'stack' ? 'grid' : 'stack')}>Toggle shell arrangement</Button><Button onClick={() => { const prefs = layout.getSnapshot(); layout.save({ ...prefs, order: [...widgets].reverse().map(view => view.id) }); }}>Reverse shell widgets</Button><Button onClick={() => { setMode('stack'); layout.reset(); }}>Reset shell arrangement</Button><Button onClick={() => visibility(false)}>Hide shell summary</Button><Button onClick={() => visibility(true)}>Show shell summary</Button><Button onClick={() => setPanel(!panel)}>{panel ? 'Close shell panel' : 'Open shell panel'}</Button><Button onClick={() => { void app.registry.unload('fake-ops'); }}>Unload shell plugin owner</Button></section><section aria-label="Shell plugin widgets" className={mode === 'grid' ? 'shell-widgets shell-widgets-grid' : 'shell-widgets'}>{widgets.map(widget => <div key={widget.id} data-shell-widget={widget.ref.key}><WidgetRenderer widget={widget}/></div>)}</section><section aria-label="Shell plugin panel">{panel && panels.map(view => <PluginPanelBody key={`${route}:${view.id}`} panel={view}/>)}</section>{route === 'detail' && <section aria-label="Shell plugin page">{app.select('operations.page').map(view => <PluginPanelBody key={view.id} panel={view}/>)}</section>}<section aria-label="Shell embedded view"><h2>Embedded view: {app.contextKey}</h2><p>Host-owned fixture records remain available after plugin withdrawal.</p>{Array.from({ length: 18 }, (_, index) => <p key={index} className="shell-record">Local read-only shell record {index + 1}</p>)}</section></div></DetailPageLayout></AppShell>;
}
export function ShellStartup() {
    const [app, setApp] = useState<App>(), [error, setError] = useState(''), current = useRef<App | undefined>(undefined), serial = useRef(0), mounted = useRef(false), loading = useRef<AbortController | undefined>(undefined), factory = useRef<(key: string) => App>(key => createRoutingExample(key));
    useEffect(() => {
        mounted.current = true;
        const leases = createStylesheetLeases(document), sink = leasedStylesheets(leases, (_key, url) => url === '/plugins/fake-ops/g1/style.css' ? { owner: 'fake-ops', generation: 'g1' } : undefined);
        factory.current = key => createRoutingExample(key, sink);
        const next = factory.current('shell-context-a');
        current.current = next;
        setApp(next);
        const controller = new AbortController();
        loading.current = controller;
        void next.load('/plugins/registry', controller.signal).catch(() => {
            if (mounted.current && current.current === next && !controller.signal.aborted)
                setError('Shell registry unavailable');
        });
        return () => { mounted.current = false; serial.current++; loading.current?.abort(); const live = current.current; current.current = undefined; void (live?.dispose() ?? Promise.resolve()).finally(() => { sink.dispose(); leases.dispose(); }); };
    }, []);
    async function switchContext() {
        const old = current.current;
        if (!old)
            return;
        current.current = undefined;
        const epoch = ++serial.current;
        loading.current?.abort();
        old.invalidateContext();
        setApp(undefined);
        await old.dispose();
        if (!mounted.current || epoch !== serial.current)
            return;
        const next = factory.current(`shell-context-${epoch + 1}`);
        current.current = next;
        setApp(next);
        const controller = new AbortController();
        loading.current = controller;
        try {
            await next.load('/plugins/registry', controller.signal);
        }
        catch {
            if (mounted.current && epoch === serial.current)
                setError('Shell registry unavailable');
        }
        finally {
            if (!mounted.current || epoch !== serial.current)
                await next.dispose();
        }
    }
    return error ? <p role="alert">{error}</p> : app ? <PluginHostProvider runtime={app.runtime}><ShellViews key={app.contextKey} app={app} switchContext={() => { void switchContext(); }}/></PluginHostProvider> : <p>Loading shell context</p>;
}
