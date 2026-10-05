import { useEffect, useState, useSyncExternalStore } from 'react';
import { HealthSummary, StatCollection, DiagnosticPanel } from '@hollis-labs/kit-observe';
import { SampleSeriesView } from '@hollis-labs/kit-observe/charts';
import { controlledObservationFixture } from '../src/observation-fixture.js';
const now = Date.parse('2026-10-05T00:00:00Z');
export function ObservationStartup() {
    const [app] = useState(() => controlledObservationFixture('principal-a', now));
    const snapshot = useSyncExternalStore(app.state.subscribe, app.state.getSnapshot, app.state.getSnapshot);
    useEffect(() => () => app.dispose(), [app]);
    return <main className="p-4 space-y-4"><h1>Controlled observation proof</h1><p>App-owned fixture evidence; no provider reads, telemetry transport or business effects.</p><p>Observation context: {snapshot.contextKey}</p><p>Source: {snapshot.sourceKey}</p>
 <nav aria-label="Observation scenarios">{(['ready', 'initial-loading', 'initial-error', 'invalid-diagnostics', 'unsupported-diagnostics', 'unsupported-series', 'empty-series', 'truncated-series', 'paused'] as const).map(kind => <button key={kind} onClick={() => app.scenario(kind)}>{kind}</button>)}</nav>
 <nav aria-label="Observation controls"><button onClick={() => app.clock(now + 10000)}>Advance observation clock</button><button onClick={() => app.clock(now - 10000)}>Skew observation clock</button><button onClick={() => app.refresh('health')}>Refresh health success</button><button onClick={() => app.refresh('health', 'failure')}>Refresh health failure</button><button onClick={() => app.refresh('zero')}>Refresh requests success</button><button onClick={() => app.refresh('zero', 'failure')}>Refresh requests failure</button><button onClick={() => app.refresh('series', 'failure')}>Refresh series failure</button><button onClick={() => app.refresh('diagnostics', 'failure')}>Refresh diagnostics failure</button><button onClick={() => app.releaseNext()}>Release observation producer</button><button onClick={() => app.reset('principal-b', 'observation-v1')}>Switch observation context</button><button onClick={() => app.reset(snapshot.contextKey, 'observation-v2')}>Retire observation source</button></nav>
 <div className="observation-layout" key={`${snapshot.contextKey}:${snapshot.sourceKey}`}><HealthSummary {...snapshot.health}/><StatCollection {...snapshot.stats}/><DiagnosticPanel {...snapshot.diagnostics}/><SampleSeriesView {...snapshot.series}/></div></main>;
}
