import type { BarListItem } from '@hollis-labs/kit-dashboard/widgets';
import type { PlaybackFrame } from './playback-fixture.js';
/** App-authored recorded counts, not service measurements or a telemetry schema. */
export function dashboardEvidence(frame: PlaybackFrame) {
    const items: BarListItem[] = frame.records.map(record => ({ label: record.text.replace(`${frame.sourceKey}: `, ''), value: 1 }));
    return { cutoff: frame.cutoff, sourceKey: frame.sourceKey, recordedCount: frame.records.length, coverage: frame.terminal ? 'complete authored fixture' : 'partial recorded prefix', observedErrors: 0 as const, spend: null, items };
}
