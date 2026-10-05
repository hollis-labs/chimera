import './dashboard-style.css';
import { Panel, Kpi, KpiGrid, BarList } from '@hollis-labs/kit-dashboard/widgets';
import type { PlaybackFrame } from './playback-fixture.js';
import { dashboardEvidence } from './dashboard-evidence.js';
export function DashboardPanels({ frame }: {
    frame: PlaybackFrame;
}) {
    const evidence = dashboardEvidence(frame);
    return <section className="dashboard-panels" aria-label="Recorded dashboard evidence"><Panel title="Recorded fixture evidence" icon={<span aria-hidden="true">◷</span>} meta="Counts at cutoff"><KpiGrid cols="grid-cols-1 sm:grid-cols-3"><Kpi label="Recorded events" value={evidence.recordedCount} sub="count · current source"/><Kpi label="Observed errors" value={evidence.observedErrors} sub="count · authored zero"/><Kpi label="Spend" value="Not collected" sub="unknown · no currency evidence"/></KpiGrid><p className="dashboard-caption">Evidence through {new Date(evidence.cutoff).toISOString()}; {evidence.sourceKey}. Coverage: {evidence.coverage}. Fixed authored evidence; no live freshness or rate claim.</p></Panel><Panel title="Recorded categories" icon={<span aria-hidden="true">≡</span>} meta="One event each"><div className="dashboard-category-list"><BarList items={evidence.items}/></div><p className="dashboard-caption">Only events at or before cutoff. Future outcomes are withheld.</p></Panel></section>;
}
