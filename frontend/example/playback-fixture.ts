import { version } from 'react';
import type { HostScope, AppIsolationSnapshot } from '@hollis-labs/plugin-host-ui';
import type { StylesheetSink } from '@hollis-labs/plugin-registry';
import { createPresentationComposition, memoryLayoutStorage } from '../src/composition.js';
import { createFixtureActions } from '../src/fixture-actions.js';
import { exampleCatalog, exampleKinds, exampleRegions } from '../src/routing-example.js';
import { store } from '../src/store.js';
export const playbackBoundaries = Object.freeze([Date.parse('2026-10-05T12:00:00.000Z'), Date.parse('2026-10-05T12:00:01.200Z'), Date.parse('2026-10-05T12:00:03.100Z'), Date.parse('2026-10-05T12:00:06.000Z')]);
export type PlaybackFrame = Readonly<{
    fixture: true;
    contextKey: string;
    sourceKey: string;
    index: number;
    cutoff: number;
    epoch: number;
    playing: boolean;
    terminal: boolean;
    contextLabel: string;
    records: readonly Readonly<{
        at: number;
        text: string;
    }>[];
    outcome?: string;
}> & Readonly<Record<string, unknown>>;
function projection(contextKey: string, sourceKey: string, index: number, epoch: number, playing: boolean): PlaybackFrame {
    const records = playbackBoundaries.map((at, index) => Object.freeze({ at, text: `${sourceKey}: ${['queued', 'started', 'review ready', 'final fixture outcome'][index]}` })).filter(record => record.at <= playbackBoundaries[index]);
    return Object.freeze({ fixture: true, contextKey, sourceKey, index, cutoff: playbackBoundaries[index], epoch, playing: playing && index < 3, terminal: index === 3, contextLabel: `${contextKey}/${sourceKey}: frame ${index}; ${records[records.length - 1].text}`, records: Object.freeze(records), ...(index === 3 ? { outcome: 'final fixture outcome' } : {}) });
}
/** App-owned four-boundary proof only; shared host/action authority is unchanged. */
export function createPlaybackFixture(contextKey: string, stylesheets: StylesheetSink | false = false) {
    const scope: HostScope = { appId: 'playback-proof', environmentId: 'offline-fixture', projectId: contextKey, clientId: 'browser' };
    const liveScope = store<HostScope | undefined>(scope), frame = store<PlaybackFrame>(projection(contextKey, 'source-a', 0, 0, false));
    const isolation = store<AppIsolationSnapshot>({ appId: scope.appId, effectiveMode: 'main-origin', revision: 'explicit-reviewed-offline-fixture' });
    const validated = store<Readonly<Pick<PlaybackFrame, 'contextKey' | 'sourceKey' | 'index' | 'cutoff' | 'epoch'>> | undefined>(undefined);
    const releaseValidated = frame.subscribe(() => validated.set(undefined));
    const pending: {
        resolve: () => void;
        signal: AbortSignal;
    }[] = [];
    let disposed = false, sourceVersion = 0;
    const actions = createFixtureActions({ scope: liveScope, invocation: frame, routes: ['overview', 'detail'], modalRegions: ['operations.modal'], commands: { 'fixture-tools/run': { validate: intent => Object.keys(intent.arguments).length === 0, outcome: 'success' } }, authorize: context => { const current = frame.getSnapshot(), keys = ['contextKey', 'sourceKey', 'index', 'cutoff', 'epoch'] as const; const approved = !disposed && context.invocation.fixture === true && keys.every(key => context.invocation[key] === current[key]); if (approved)
            validated.set(Object.freeze({ contextKey: String(context.invocation.contextKey), sourceKey: String(context.invocation.sourceKey), index: Number(context.invocation.index), cutoff: Number(context.invocation.cutoff), epoch: Number(context.invocation.epoch) })); return approved; }, navigate: () => { }, wait: (_intent, signal) => new Promise<void>(resolve => pending.push({ resolve, signal })) });
    // The SAME immutable frame observable supplies props and invocation. No separate
    // cutoff updates can expose future render context under an older action identity.
    const app = createPresentationComposition({ scope, registryOptions: { kinds: exampleKinds, regions: exampleRegions, runtimes: { react: version }, stylesheets }, catalog: exampleCatalog, routes: [{ id: 'overview', label: 'Overview', path: '/', region: 'operations.summary' }], storage: memoryLayoutStorage(), isolation, renderContext: frame, actions: actions.adapter });
    actions.observe(app.runtime);
    function move(index: number, playing = false, sourceKey = frame.getSnapshot().sourceKey) {
        if (disposed)
            return;
        if (!Number.isInteger(index) || index < 0 || index >= playbackBoundaries.length)
            throw new Error('Authored playback boundary required');
        frame.set(projection(contextKey, sourceKey, index, frame.getSnapshot().epoch + 1, playing));
    }
    return { ...app, actions, frame, validated,
        play() {
            const current = frame.getSnapshot();
            if (!disposed && !current.terminal && !current.playing)
                move(current.index, true);
        },
        pause() {
            const current = frame.getSnapshot();
            if (!disposed && current.playing)
                move(current.index);
        },
        advance() {
            const current = frame.getSnapshot();
            if (!disposed && current.playing && !current.terminal)
                move(current.index + 1, true);
        },
        seek(index: number) { move(index); }, reset() { move(0); }, retireSource() { move(0, false, `source-${++sourceVersion}`); },
        complete() {
            for (const producer of pending.splice(0))
                producer.resolve();
        },
        pendingSignals() { return pending.map(producer => producer.signal); },
        async dispose() {
            if (disposed)
                return;
            disposed = true;
            releaseValidated();
            validated.set(undefined);
            liveScope.set(undefined);
            actions.dispose();
            await app.dispose();
        } };
}
