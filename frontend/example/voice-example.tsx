import './voice-style.css';
import { useEffect, useRef, useState } from 'react';
import { SpeechInput, Transcription, TranscriptionSegment, VoiceSelector, VoiceSelectorTrigger, VoiceSelectorContent, VoiceSelectorInput, VoiceSelectorList, VoiceSelectorItem, VoiceSelectorName, type TranscriptionSegmentData } from '@hollis-labs/kit-voice';
import { AudioPlayer, AudioPlayerElement, AudioPlayerControlBar, AudioPlayerPlayButton, AudioPlayerTimeRange, AudioPlayerTimeDisplay } from '@hollis-labs/kit-voice/audio-player';
import { createAdminPresentationSession } from '../src/admin-session.js';
const segments: TranscriptionSegmentData[] = [{ text: 'Local review', startSecond: 0, endSecond: 2 }, { text: 'Second segment', startSecond: 2, endSecond: 4 }, { text: 'Final segment', startSecond: 4, endSecond: 8 }];
// Authored eight-second PCM silence: no external recording, file or service.
function fixtureAudio() {
    const bytes = new ArrayBuffer(44 + 8000 * 8 * 2), view = new DataView(bytes);
    function text(at: number, value: string) {
        for (let i = 0; i < value.length; i++)
            view.setUint8(at + i, value.charCodeAt(i));
    }
    text(0, 'RIFF');
    view.setUint32(4, bytes.byteLength - 8, true);
    text(8, 'WAVE');
    text(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, 8000, true);
    view.setUint32(28, 16000, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    text(36, 'data');
    view.setUint32(40, bytes.byteLength - 44, true);
    return new Blob([bytes], { type: 'audio/wav' });
}
export function VoiceStartup() {
    const [session] = useState(() => createAdminPresentationSession('voice-context-a', 'voice-source-a', ['preview']));
    const [context, setContext] = useState('voice-context-a'), [source, setSource] = useState('voice-source-a'), [voice, setVoice] = useState('calm'), [open, setOpen] = useState(false), [time, setTime] = useState(0), [audio, setAudio] = useState(fixtureAudio), [outcome, setOutcome] = useState('Local authored silence ready'), [showPlayer, setShowPlayer] = useState(true), [audioEpoch, setAudioEpoch] = useState(0);
    const player = useRef<HTMLAudioElement | null>(null), held = useRef<(() => void)[]>([]), serial = useRef(0), currentAudio = useRef(0);
    useEffect(() => () => { session.dispose(); held.current = []; }, [session]);
    function replaceAudio() { setAudioEpoch(++currentAudio.current); setAudio(fixtureAudio()); }
    function stop() { player.current?.pause(); setTime(0); }
    function select(next: string) {
        if (!['calm', 'clear'].includes(next))
            return;
        session.begin('preview').cancel();
        stop();
        setVoice(next);
        replaceAudio();
        setOutcome('Local authored silence ready');
        setOpen(false);
    }
    function preview() { const ticket = session.begin('preview'), captured = { context, source, voice }; setOutcome('Preview pending'); held.current.push(() => ticket.commit(() => { stop(); replaceAudio(); setOutcome(`Fixture preview ready: ${captured.voice}; ${captured.context}/${captured.source}`); })); }
    function retire(kind: 'context' | 'source') { const epoch = ++serial.current, nextContext = kind === 'context' ? `voice-context-${epoch}` : context, nextSource = kind === 'source' ? `voice-source-${epoch}` : source; session.reset(nextContext, nextSource); stop(); setContext(nextContext); setSource(nextSource); setVoice('calm'); setOpen(false); setShowPlayer(true); replaceAudio(); setOutcome('Local authored silence ready'); }
    function seek(next: number) {
        if (player.current)
            player.current.currentTime = next;
        setTime(next);
    }
    return <main className="p-4 space-y-4"><h1>Controlled voice and media proof</h1><p>Authored silent audio and local selections only. Recording and device access are unavailable in this proof.</p><p>Voice context: {context}; source: {source}</p><nav aria-label="Voice fixture controls"><button onClick={preview}>Prepare held voice preview</button><button onClick={() => held.current.shift()?.()}>Release voice preview</button><button onClick={() => retire('context')}>Switch voice context</button><button onClick={() => retire('source')}>Retire voice source</button><button onClick={() => { stop(); setShowPlayer(false); }}>Unmount local player</button></nav><p role="status" aria-label="Voice preview outcome">{outcome}</p><div className="voice-layout"><section aria-label="Controlled voice selection"><VoiceSelector value={voice} onValueChange={next => {
            if (next)
                select(next);
        }} open={open} onOpenChange={setOpen}><VoiceSelectorTrigger className="rounded-control bg-bg-elevated px-3 py-2 text-fg">Select local voice: {voice}</VoiceSelectorTrigger><VoiceSelectorContent title="Local fixture voices"><VoiceSelectorInput placeholder="Search local voices"/><VoiceSelectorList>{['calm', 'clear'].map(id => <VoiceSelectorItem key={id} value={id} keywords={[id]} onSelect={() => select(id)}><VoiceSelectorName>{id}</VoiceSelectorName></VoiceSelectorItem>)}</VoiceSelectorList></VoiceSelectorContent></VoiceSelector><SpeechInput disabled aria-label="Recording disabled for this fixture"/><p>No microphone or camera enumeration, permission request or capture is wired.</p></section><section aria-label="Controlled local playback">{showPlayer ? <AudioPlayer key={`${context}:${source}:${voice}:${audioEpoch}`}><AudioPlayerElement ref={player} blob={audio} preload="metadata" onTimeUpdate={event => {
                if (event.currentTarget === player.current && audioEpoch === currentAudio.current)
                    setTime(event.currentTarget.currentTime);
            }} onError={event => {
                if (event.currentTarget === player.current && audioEpoch === currentAudio.current)
                    setOutcome('Local audio unavailable');
            }}/><AudioPlayerControlBar><AudioPlayerPlayButton /><AudioPlayerTimeDisplay /><AudioPlayerTimeRange /></AudioPlayerControlBar></AudioPlayer> : <p>Local player unmounted</p>}<p>Authored timing over silence; no speech transcription occurred.</p><p>Playback seconds: {time.toFixed(2)}</p><Transcription segments={segments} currentTime={time} onSeek={seek}>{(segment, index) => <TranscriptionSegment key={segment.text} segment={segment} index={index}/>}</Transcription><p>Untimed review has no seek controls:</p><Transcription segments={segments} currentTime={time}>{(segment, index) => <TranscriptionSegment key={segment.text} segment={segment} index={index}/>}</Transcription></section></div></main>;
}
