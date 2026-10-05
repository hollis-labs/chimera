# Controlled voice and media review

The isolated consumer at `/?voice=1` uses actual kit-voice VoiceSelector, Transcription and disabled SpeechInput, plus the explicit optional AudioPlayer subpath. Existing controlled props and `createAdminPresentationSession` suffice; this checkpoint introduces no reusable host API.

The app owns two synthetic voice choices, dialog open state, an authored eight-second PCM silence Blob, playback position and three authored timing segments. These labels and timings are fixtures over silence, not recorded speech, TTS or transcription. Actual media controls play/pause local audio, and keyboard transcript buttons seek the current player in seconds. A second transcript omits onSeek and renders plain spans rather than empty tab stops.

MicSelector and useAudioDevices are deliberately unadopted: their actual device discovery/permission behavior has no controlled synthetic-device input. SpeechInput stays disabled. No recording, microphone/camera permissions, device enumeration, speech recognition, provider, streaming service, persistence or business execution is wired. Preview preparation is a held local fixture producer, outside the selector's option rows; the upstream nested-preview listbox accessibility caveat is avoided.

## Lifetime and presentation ownership

The app declares one `preview` ticket channel. Explicit release simulates a producer that ignores AbortSignal; only a current ticket may commit a new local Blob/outcome. Context/source retirement and voice selection cancel pending outcomes, pause playback and reset app-owned state. Latest-channel supersession is also proved. This fences local presentation, not backend operation cancellation or rollback.

Every audio replacement advances an app-owned player epoch and remounts its actual kit player. Media time/error callbacks require both current element and epoch identity. Delayed events from retired elements cannot replace current position or outcome. Actual kit AudioPlayerElement creates/revokes its Blob URL; browser proof observes revocation on replacement and explicit unmount, and starts real playback before checking teardown pause. No parallel media runtime or URL lease mechanism is added.

The consumer lazily loads this optional voice/media proof; other host consumers do not import its media entry. An actual Vite module-graph audit of kit-voice root deliberately leaves media-chrome non-external and proves it is absent. The app explicitly opts into AudioPlayer and its single media-chrome4.19.3 peer. Root Tailwind scans candidate compiled utility strings; app fixture layout and transcript readability overrides stay in its lazy stylesheet. Candidate muted text was too dim for this proof's dark surface, so inactive segments use fg-secondary and active segments use full fg plus primary underline; keyboard focus has a token-based outline. Upstream component bytes remain unchanged.

## Exact dependencies and evidence

kit-voice is a private unpublished0.0.0 candidate: npm lookup returned E404 on 2026-10-05. Chimera copies Parallax's exact archive/provenance from design-kit commit `dbcf4fa7f5bcfe83686d227b39ddf9426cea4fe5`, with complete MIT AND Apache-2.0 terms:

- Archive SHA256 `e70d3086775f337c3badc95c40e41d1300d826d62f0edb083952e250d1dd827a`.
- Candidate build-only adaptation uses isolated TypeScript6.0.2 declarations because its SpeechRecognitionEvent types are absent from TS5.9 lib.dom; runtime/CSS/package metadata are unchanged. Consumer remains TS5.9.3 with negative public-type assertions.
- Exact published design-components0.4.0 supplies the primitive APIs despite stale source README release guidance. media-chrome4.19.3 is pinned and deduplicated; full MIT peer license is also served locally.

Seven actual Chromium cases cover selector search/keyboard/Escape, local playback and active segment boundaries, context/source/selection plus same-channel retirement, old media event refusal, Blob revocation/pause, narrow geometry/token styles and no capture/external/mutation calls. Two additional units audit root dependency isolation and exact mixed license distribution. Prior frame/admin/observation/action/lifecycle checks remain mandatory. Folio0109 and actual Tachyon adoption remain outside this checkpoint; no upstream source, npm release or live deployment is included.
