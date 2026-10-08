import './playback-style.css';
import { SettingsReviewProof } from './settings-review-example.js';
import { WidgetsProof } from './widgets-example.js';
import { InspectorProof } from './inspector-example.js';
import { OverlayProof } from './overlay-example.js';
import { DashboardPanels } from './dashboard-panels.js';
import { Button } from '@hollis-labs/design-components';
import { lazy, Suspense, useEffect, useRef, useState, useSyncExternalStore } from 'react';
const EventLedgerProof=lazy(()=>import('./event-ledger-example.js').then(module=>({default:module.EventLedgerProof})));
const ContributionSwitcherProof=lazy(()=>import('./contribution-switcher-example.js').then(module=>({default:module.ContributionSwitcherProof})));
const OpsMetricsProof=lazy(()=>import('./ops-metrics-example.js').then(module=>({default:module.OpsMetricsProof})));
const DirectoryReviewProof=lazy(()=>import('./directory-review-example.js').then(module=>({default:module.DirectoryReviewProof})));
const ContributionWorkbenchProof=lazy(()=>import('./contribution-workbench-example.js').then(module=>({default:module.ContributionWorkbenchProof})));
const UsageEvidenceProof=lazy(()=>import('./usage-evidence-example.js').then(module=>({default:module.UsageEvidenceProof})));
const ConversationEvidenceProof=lazy(()=>import('./conversation-evidence-example.js').then(module=>({default:module.ConversationEvidenceProof})));
const WorkflowReviewProof=lazy(()=>import('./workflow-review-example.js').then(module=>({default:module.WorkflowReviewProof})));
const DeveloperEvidenceProof=lazy(()=>import('./developer-evidence-example.js').then(module=>({default:module.DeveloperEvidenceProof})));
const ExplorerReviewProof = lazy(() => import('./explorer-review-example.js').then(module => ({default: module.ExplorerReviewProof})));
const AdminReviewProof = lazy(() => import('./admin-review-example.js').then(module => ({default: module.AdminReviewProof})));
const ObservationReviewProof = lazy(() => import('./observation-review-example.js').then(module => ({default: module.ObservationReviewProof})));
const ConversationReviewProof = lazy(() => import('./conversation-review-example.js').then(module => ({default: module.ConversationReviewProof})));
const AccountReviewProof = lazy(() => import('./account-review-example.js').then(module => ({default: module.AccountReviewProof})));
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
function PlaybackViews({ app, switchContext, retire, completePrevious, retainRetiredOverlay, releaseRetiredOverlay, dashboard = false, overlays = false, inspector = false, widgets = false, settingsReview = false, retainSettingsProducer = () => {}, accountReview = false, retainAccountProducer = () => {}, eventLedger=false, retainLedgerProducer=()=>{}, releaseLedgerProducer=()=>{}, contributionSwitcher=false, retainSwitcherProducer=()=>{}, releaseSwitcherProducer=()=>{}, opsMetrics=false, retainMetricsProducer=()=>{}, releaseMetricsProducer=()=>{}, directoryReview=false, retainDirectoryProducer=()=>{}, releaseDirectoryProducer=()=>{}, contributionWorkbench=false, retainWorkbenchProducer=()=>{}, releaseWorkbenchProducer=()=>{}, usageEvidence=false, retainUsageProducer=()=>{}, releaseUsageProducer=()=>{}, conversationEvidence=false, retainConversationEvidenceProducer=()=>{}, releaseConversationEvidenceProducer=()=>{}, workflowReview=false, retainWorkflowProducer=()=>{}, releaseWorkflowProducer=()=>{}, developerEvidence=false, retainDeveloperEvidenceProducer=()=>{}, releaseDeveloperEvidenceProducer=()=>{}, explorerReview = false, retainExplorerProducer = () => {}, releaseExplorerProducer = () => {}, adminReview = false, adminShellReview = false, retainAdminProducer = () => {}, observationReview = false, retainObservationProducer = () => {}, conversationReview = false, retainConversationProducer = () => {} }: {
    app: App;
    switchContext: () => void;
    retire: () => void;
    completePrevious: () => void;
    retainRetiredOverlay: (release: () => void) => void;
    releaseRetiredOverlay: () => void;
    dashboard?: boolean;
    overlays?: boolean;
    inspector?: boolean;
    widgets?: boolean;
    settingsReview?: boolean;
    accountReview?: boolean;
    eventLedger?: boolean;
    retainLedgerProducer?: (release:()=>void)=>void;
    releaseLedgerProducer?: ()=>void;
    contributionSwitcher?: boolean;
    retainSwitcherProducer?: (release:()=>void)=>void;
    releaseSwitcherProducer?: ()=>void;
    opsMetrics?: boolean;
    retainMetricsProducer?: (release:()=>void)=>void;
    releaseMetricsProducer?: ()=>void;
    directoryReview?: boolean;
    retainDirectoryProducer?: (release:()=>void)=>void;
    releaseDirectoryProducer?: ()=>void;
    contributionWorkbench?: boolean;
    retainWorkbenchProducer?: (release:()=>void)=>void;
    releaseWorkbenchProducer?: ()=>void;
    usageEvidence?: boolean;
    retainUsageProducer?: (release:()=>void)=>void;
    releaseUsageProducer?: ()=>void;
    conversationEvidence?: boolean;
    retainConversationEvidenceProducer?: (release:()=>void)=>void;
    releaseConversationEvidenceProducer?: ()=>void;
    workflowReview?: boolean;
    retainWorkflowProducer?: (release:()=>void)=>void;
    releaseWorkflowProducer?: ()=>void;
    developerEvidence?: boolean;
    retainDeveloperEvidenceProducer?: (release:()=>void)=>void;
    releaseDeveloperEvidenceProducer?: ()=>void;
    explorerReview?: boolean;
    retainExplorerProducer?: (release: () => void) => void;
    releaseExplorerProducer?: () => void;
    adminReview?: boolean;
    adminShellReview?: boolean;
    retainAdminProducer?: (release: () => void) => void;
    observationReview?: boolean;
    retainObservationProducer?: (release: () => void) => void;
    conversationReview?: boolean;
    retainConversationProducer?: (release: () => void) => void;
    retainAccountProducer?: (release: () => void) => void;
    retainSettingsProducer?: (release: () => void) => void;
}) {
    useSyncExternalStore(app.runtime.subscribe, app.runtime.getSnapshot, app.runtime.getSnapshot);
    const frame = useSyncExternalStore(app.frame.subscribe, app.frame.getSnapshot, app.frame.getSnapshot), receipts = useSyncExternalStore(app.actions.receipts.subscribe, app.actions.receipts.getSnapshot, app.actions.receipts.getSnapshot);
    const validated = useSyncExternalStore(app.validated.subscribe, app.validated.getSnapshot, app.validated.getSnapshot);
    useEffect(() => {
        if (!overlays && !inspector && !settingsReview && !accountReview && !conversationReview && !observationReview && !adminReview && !explorerReview && !developerEvidence && !workflowReview && !conversationEvidence && !usageEvidence && !contributionWorkbench && !eventLedger && !contributionSwitcher && !opsMetrics && !directoryReview)
            return;
        const target = document.querySelector<HTMLElement>('main h1');
        const id = requestAnimationFrame(() => {
            if (target?.isConnected)
                target.focus();
        });
        return () => cancelAnimationFrame(id);
    }, [app, overlays, inspector, settingsReview, accountReview, conversationReview, observationReview, adminReview, explorerReview, developerEvidence, workflowReview, conversationEvidence, usageEvidence, contributionWorkbench, eventLedger, contributionSwitcher, opsMetrics, directoryReview]);
    const [compact, setCompact] = useState(false);
    const layout = app.layouts.get('operations.summary')!;
    useSyncExternalStore(layout.subscribe, layout.getSnapshot, layout.getSnapshot);
    function toggleSummary() {
        const prefs = layout.getSnapshot(), view = app.runtime.getSnapshot().views.find(view => view.ref.key === 'summary');
        if (view)
            layout.save({ ...prefs, visibility: { ...prefs.visibility, [view.id]: prefs.visibility[view.id] === false } });
    }
    const intent = app.select('operations.toolbar').find(view => view.ref.key === 'delayed');
    if(eventLedger)return <Suspense fallback={<p>Loading event ledger</p>}><EventLedgerProof app={app} retainRetired={retainLedgerProducer} releaseRetired={releaseLedgerProducer} switchContext={switchContext} retire={retire}/></Suspense>;
    if(contributionSwitcher)return <Suspense fallback={<p>Loading contribution switcher</p>}><ContributionSwitcherProof app={app} retainRetired={retainSwitcherProducer} releaseRetired={releaseSwitcherProducer} switchContext={switchContext} retire={retire}/></Suspense>;
    if(opsMetrics)return <Suspense fallback={<p>Loading operations metrics</p>}><OpsMetricsProof app={app} retainRetired={retainMetricsProducer} releaseRetired={releaseMetricsProducer} switchContext={switchContext} retire={retire}/></Suspense>;
    if(directoryReview)return <Suspense fallback={<p>Loading readonly directory</p>}><DirectoryReviewProof app={app} retainRetired={retainDirectoryProducer} releaseRetired={releaseDirectoryProducer} switchContext={switchContext} retire={retire}/></Suspense>;
    if(contributionWorkbench)return <Suspense fallback={<p>Loading current contribution review</p>}><ContributionWorkbenchProof app={app} retainRetired={retainWorkbenchProducer} releaseRetired={releaseWorkbenchProducer} switchContext={switchContext} retire={retire}/></Suspense>;
    if(usageEvidence)return <Suspense fallback={<p>Loading usage evidence</p>}><UsageEvidenceProof app={app} retainRetired={retainUsageProducer} releaseRetired={releaseUsageProducer} switchContext={switchContext} retire={retire}/></Suspense>;
    if(conversationEvidence)return <Suspense fallback={<p>Loading conversation evidence</p>}><ConversationEvidenceProof app={app} retainRetired={retainConversationEvidenceProducer} releaseRetired={releaseConversationEvidenceProducer} switchContext={switchContext} retire={retire}/></Suspense>;
    if(workflowReview)return <Suspense fallback={<p>Loading workflow review</p>}><WorkflowReviewProof app={app} retainRetired={retainWorkflowProducer} releaseRetired={releaseWorkflowProducer} switchContext={switchContext} retire={retire}/></Suspense>;
    if(developerEvidence)return <Suspense fallback={<p>Loading developer evidence</p>}><DeveloperEvidenceProof app={app} retainRetired={retainDeveloperEvidenceProducer} releaseRetired={releaseDeveloperEvidenceProducer} switchContext={switchContext} retire={retire}/></Suspense>;
    if(explorerReview)return <Suspense fallback={<p>Loading controlled explorer</p>}><ExplorerReviewProof app={app} retainRetired={retainExplorerProducer} releaseRetired={releaseExplorerProducer} switchContext={switchContext} retire={retire}/></Suspense>;
    if(adminShellReview)return <Suspense fallback={<p>Loading standalone admin shell</p>}><AdminReviewProof app={app} standalone retainRetired={retainAdminProducer} switchContext={switchContext} retire={retire}/></Suspense>;
    return <main className="playback-proof"><h1 tabIndex={-1}>{adminReview ? 'Controlled admin destination proof' : observationReview ? 'Controlled observation retry proof' : conversationReview ? 'Controlled conversation review proof' : accountReview ? 'Controlled account review proof' : settingsReview ? 'Controlled settings review proof' : widgets ? 'Controlled visual widgets proof' : inspector ? 'Controlled payload inspector proof' : overlays ? 'Controlled overlay retirement proof' : dashboard ? 'Controlled dashboard composition proof' : 'Controlled deterministic playback proof'}</h1><p>Manual local clock over four authored UTC boundaries. No timer, stream or provider effects.</p><p>Playback context: {frame.contextKey}; source: {frame.sourceKey}</p><nav aria-label="Playback controls"><Button disabled={frame.playing || frame.terminal} onClick={() => app.play()}>Play fixture</Button><Button disabled={!frame.playing} onClick={() => app.pause()}>Pause fixture</Button><Button disabled={!frame.playing || frame.terminal} onClick={() => app.advance()}>Advance fixture clock</Button><Button onClick={() => app.reset()}>Reset playback</Button><Button onClick={() => app.retireSource()}>Retire playback source</Button><Button onClick={switchContext}>Switch playback context</Button><Button onClick={() => { void app.registry.unload('fake-ops'); }}>Unload playback plugin owner</Button><Button onClick={retire}>Unmount playback consumer</Button></nav><label>Authored boundary<input aria-label="Playback boundary" type="range" min="0" max="3" step="1" value={frame.index} onChange={event => app.seek(Number(event.target.value))}/></label><p role="status" aria-label="Playback clock">Frame {frame.index}/3; {new Date(frame.cutoff).toISOString()}; {frame.terminal ? 'ended' : frame.playing ? 'playing' : 'paused'}</p>{dashboard && <><nav aria-label="Dashboard composition controls"><Button aria-pressed={compact} onClick={() => setCompact(value => !value)}>Toggle compact dashboard</Button><Button onClick={() => { const prefs = layout.getSnapshot(); layout.save({ ...prefs, order: [...prefs.order].reverse() }); }}>Reverse dashboard widgets</Button><Button onClick={toggleSummary}>Toggle summary widget</Button></nav><DashboardPanels frame={frame}/></>}<div className={dashboard && compact ? 'playback-columns dashboard-compact' : 'playback-columns'}><section aria-label="Visible playback records"><h2>Records at or before cutoff</h2>{frame.records.map(record => <p key={record.at}>{new Date(record.at).toISOString()} — {record.text}</p>)}{frame.outcome && <p>Recorded outcome: {frame.outcome}</p>}</section><section aria-label="Playback plugin presentation" key={frame.epoch}>{app.select('operations.summary').filter(view => ['summary', 'stable'].includes(view.ref.key)).map(view => <WidgetRenderer key={view.id} widget={view}/>)}{app.select('operations.detail').map(view => <PluginPanelBody key={view.id} panel={view}/>)}{intent && <HeldIntent view={intent} epoch={frame.epoch}/>}</section></div>{adminReview && <Suspense fallback={<p>Loading admin presentation</p>}><AdminReviewProof app={app} retainRetired={retainAdminProducer} switchContext={switchContext} retire={retire}/></Suspense>}{observationReview && <Suspense fallback={<p>Loading local observation review</p>}><ObservationReviewProof app={app} retainRetired={retainObservationProducer} switchContext={switchContext} retire={retire}/></Suspense>}{conversationReview && <Suspense fallback={<p>Loading local conversation presentation</p>}><ConversationReviewProof app={app} retainRetired={retainConversationProducer} switchContext={switchContext} retire={retire}/></Suspense>} {accountReview && <Suspense fallback={<p>Loading local account presentation</p>}><AccountReviewProof app={app} retainRetired={retainAccountProducer} switchContext={switchContext} retire={retire}/></Suspense>} {settingsReview && <SettingsReviewProof app={app} retainRetired={retainSettingsProducer}/>} {widgets && <WidgetsProof app={app}/>} {inspector && <InspectorProof app={app} switchContext={switchContext} retire={retire}/>} {overlays && <OverlayProof retire={retire} app={app} switchContext={switchContext} retainRetired={retainRetiredOverlay} releaseRetired={releaseRetiredOverlay}/>}<nav aria-label="Producer release controls"><Button onClick={() => app.complete()}>Release playback producer</Button><Button onClick={completePrevious}>Release retired playback producer</Button></nav><p role="status" aria-label="Validated playback invocation">{validated ? `${validated.contextKey}/${validated.sourceKey}: frame ${validated.index}; ${new Date(validated.cutoff).toISOString()}` : 'No current validated action'}</p><section aria-label="Playback receipts">{receipts.map(receipt => <p key={receipt.id}>Fixture receipt: {receipt.status} {receipt.outcome}</p>)}</section></main>;
}
export function PlaybackStartup({ dashboard = false, overlays = false, inspector = false, widgets = false, settingsReview = false, retainSettingsProducer = () => {}, accountReview = false, retainAccountProducer = () => {}, eventLedger=false, retainLedgerProducer=()=>{}, releaseLedgerProducer=()=>{}, contributionSwitcher=false, retainSwitcherProducer=()=>{}, releaseSwitcherProducer=()=>{}, opsMetrics=false, retainMetricsProducer=()=>{}, releaseMetricsProducer=()=>{}, directoryReview=false, retainDirectoryProducer=()=>{}, releaseDirectoryProducer=()=>{}, contributionWorkbench=false, retainWorkbenchProducer=()=>{}, releaseWorkbenchProducer=()=>{}, usageEvidence=false, retainUsageProducer=()=>{}, releaseUsageProducer=()=>{}, conversationEvidence=false, retainConversationEvidenceProducer=()=>{}, releaseConversationEvidenceProducer=()=>{}, workflowReview=false, retainWorkflowProducer=()=>{}, releaseWorkflowProducer=()=>{}, developerEvidence=false, retainDeveloperEvidenceProducer=()=>{}, releaseDeveloperEvidenceProducer=()=>{}, explorerReview = false, retainExplorerProducer = () => {}, releaseExplorerProducer = () => {}, adminReview = false, adminShellReview = false, retainAdminProducer = () => {}, observationReview = false, retainObservationProducer = () => {}, conversationReview = false, retainConversationProducer = () => {} }: {
    dashboard?: boolean;
    overlays?: boolean;
    inspector?: boolean;
    widgets?: boolean;
    settingsReview?: boolean;
    accountReview?: boolean;
    eventLedger?: boolean;
    retainLedgerProducer?: (release:()=>void)=>void;
    releaseLedgerProducer?: ()=>void;
    contributionSwitcher?: boolean;
    retainSwitcherProducer?: (release:()=>void)=>void;
    releaseSwitcherProducer?: ()=>void;
    opsMetrics?: boolean;
    retainMetricsProducer?: (release:()=>void)=>void;
    releaseMetricsProducer?: ()=>void;
    directoryReview?: boolean;
    retainDirectoryProducer?: (release:()=>void)=>void;
    releaseDirectoryProducer?: ()=>void;
    contributionWorkbench?: boolean;
    retainWorkbenchProducer?: (release:()=>void)=>void;
    releaseWorkbenchProducer?: ()=>void;
    usageEvidence?: boolean;
    retainUsageProducer?: (release:()=>void)=>void;
    releaseUsageProducer?: ()=>void;
    conversationEvidence?: boolean;
    retainConversationEvidenceProducer?: (release:()=>void)=>void;
    releaseConversationEvidenceProducer?: ()=>void;
    workflowReview?: boolean;
    retainWorkflowProducer?: (release:()=>void)=>void;
    releaseWorkflowProducer?: ()=>void;
    developerEvidence?: boolean;
    retainDeveloperEvidenceProducer?: (release:()=>void)=>void;
    releaseDeveloperEvidenceProducer?: ()=>void;
    explorerReview?: boolean;
    retainExplorerProducer?: (release: () => void) => void;
    releaseExplorerProducer?: () => void;
    adminReview?: boolean;
    adminShellReview?: boolean;
    retainAdminProducer?: (release: () => void) => void;
    observationReview?: boolean;
    retainObservationProducer?: (release: () => void) => void;
    conversationReview?: boolean;
    retainConversationProducer?: (release: () => void) => void;
    retainAccountProducer?: (release: () => void) => void;
    retainSettingsProducer?: (release: () => void) => void;
} = {}) {
    const retiredOverlay = useRef<() => void>(() => { }), retainRetiredOverlay = useRef((release: () => void) => { retiredOverlay.current = release; });
    const [app, setApp] = useState<App>(), [error, setError] = useState(''), [retired, setRetired] = useState(false), current = useRef<App | undefined>(undefined), previous = useRef<() => void>(() => { }), serial = useRef(0), mounted = useRef(false), loading = useRef<AbortController | undefined>(undefined), factory = useRef<(key: string) => App>(key => createPlaybackFixture(key)), close = useRef<() => Promise<void>>(async () => { });
    useEffect(() => {
        mounted.current = true;
        const leases = createStylesheetLeases(document), sink = leasedStylesheets(leases, (_key, url) => /^\/plugins\/fake-ops\/(g1|g2)\/style\.css$/.test(url) ? { owner: 'fake-ops', generation: url.split('/')[3] } : undefined);
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
    useEffect(() => {
        if (!retired || (!overlays && !inspector && !settingsReview && !accountReview && !conversationReview && !observationReview && !adminReview && !explorerReview && !developerEvidence && !workflowReview && !conversationEvidence && !usageEvidence && !contributionWorkbench && !eventLedger && !contributionSwitcher && !opsMetrics && !directoryReview))
            return;
        const target = document.querySelector<HTMLElement>('main h1'), id = requestAnimationFrame(() => {
            if (target?.isConnected)
                target.focus();
        });
        return () => cancelAnimationFrame(id);
    }, [retired, overlays, inspector, settingsReview, accountReview, conversationReview, observationReview, adminReview, explorerReview, developerEvidence, workflowReview, conversationEvidence, usageEvidence, contributionWorkbench, eventLedger, contributionSwitcher, opsMetrics, directoryReview]);
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
    return retired ? <main className="playback-proof"><h1 tabIndex={-1}>Playback consumer retired</h1><p>No plugin presentation or producer outcome remains mounted.</p><Button onClick={() => previous.current()}>Release retired playback producer</Button>{overlays && <Button onClick={() => retiredOverlay.current()}>Release retired overlay producer</Button>}{eventLedger&&<Button onClick={releaseLedgerProducer}>Release retired ledger producer</Button>}{contributionSwitcher&&<Button onClick={releaseSwitcherProducer}>Release retired switcher producer</Button>}{opsMetrics&&<Button onClick={releaseMetricsProducer}>Release retired metric producer</Button>}{directoryReview&&<Button onClick={releaseDirectoryProducer}>Release retired directory producer</Button>}{contributionWorkbench&&<Button onClick={releaseWorkbenchProducer}>Release retired workbench producer</Button>}{usageEvidence&&<Button onClick={releaseUsageProducer}>Release retired usage producer</Button>}{conversationEvidence&&<Button onClick={releaseConversationEvidenceProducer}>Release retired conversation evidence producer</Button>}{workflowReview&&<Button onClick={releaseWorkflowProducer}>Release retired workflow producer</Button>}{developerEvidence&&<Button onClick={releaseDeveloperEvidenceProducer}>Release retired developer evidence producer</Button>}{explorerReview&&<Button onClick={releaseExplorerProducer}>Release retired explorer producer</Button>}</main> : error ? <p role="alert">{error}</p> : app ? <PluginHostProvider runtime={app.runtime}><PlaybackViews eventLedger={eventLedger} retainLedgerProducer={retainLedgerProducer} releaseLedgerProducer={releaseLedgerProducer} contributionSwitcher={contributionSwitcher} retainSwitcherProducer={retainSwitcherProducer} releaseSwitcherProducer={releaseSwitcherProducer} opsMetrics={opsMetrics} retainMetricsProducer={retainMetricsProducer} releaseMetricsProducer={releaseMetricsProducer} directoryReview={directoryReview} retainDirectoryProducer={retainDirectoryProducer} releaseDirectoryProducer={releaseDirectoryProducer} contributionWorkbench={contributionWorkbench} retainWorkbenchProducer={retainWorkbenchProducer} releaseWorkbenchProducer={releaseWorkbenchProducer} usageEvidence={usageEvidence} retainUsageProducer={retainUsageProducer} releaseUsageProducer={releaseUsageProducer} conversationEvidence={conversationEvidence} retainConversationEvidenceProducer={retainConversationEvidenceProducer} releaseConversationEvidenceProducer={releaseConversationEvidenceProducer} workflowReview={workflowReview} retainWorkflowProducer={retainWorkflowProducer} releaseWorkflowProducer={releaseWorkflowProducer} developerEvidence={developerEvidence} retainDeveloperEvidenceProducer={retainDeveloperEvidenceProducer} releaseDeveloperEvidenceProducer={releaseDeveloperEvidenceProducer} explorerReview={explorerReview} retainExplorerProducer={retainExplorerProducer} releaseExplorerProducer={releaseExplorerProducer} adminReview={adminReview} adminShellReview={adminShellReview} retainAdminProducer={retainAdminProducer} observationReview={observationReview} retainObservationProducer={retainObservationProducer} conversationReview={conversationReview} retainConversationProducer={retainConversationProducer} accountReview={accountReview} retainAccountProducer={retainAccountProducer} settingsReview={settingsReview} retainSettingsProducer={retainSettingsProducer} widgets={widgets} inspector={inspector} retainRetiredOverlay={retainRetiredOverlay.current} releaseRetiredOverlay={() => retiredOverlay.current()} overlays={overlays} dashboard={dashboard} app={app} switchContext={() => { void switchContext(); }} retire={() => { void retire(); }} completePrevious={() => previous.current()}/></PluginHostProvider> : <p>Loading playback context</p>;
}
