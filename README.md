# Chimera

Reusable Go application assembly for an embedded SPA and app-owned API/plugin handlers. Apps own product policy, discovery, credentials and effects. Chimera owns same-origin mounting and bounded HTTP-first shutdown.

```go
h, err := host.New(host.Config{Name: "example", Assets: assets, Routes: api, Plugins: plugins})
// Routes retain /api/ and Plugins retain /plugins/; Assets is rooted at index.html.
err = h.Serve(ctx, listener)
```

Import `github.com/hollis-labs/chimera/host`. A missing frontend produces go-webui's clean-start placeholder; missing built assets return 404. The library does not open a listener or contact any provider by itself.

Validation: `GOWORK=off go vet ./...` and `GOWORK=off go test -race ./...`.

Architecture: accepted Tesseract ADR `01M441CC9QHKWFJKNS4H91DNZF`. Manual execution/public repository creation were separately authorized in the implementation session. No service deployment or upstream migration is included.

The `plugins` package provides reviewed registry-v2 byte delivery and a shared protocol-2 process inventory. See [exact dependencies](docs/dependency-matrix.md) and [typed frontend integration](docs/frontend-integration.md). Browser host-ui is an explicitly unpublished licensed candidate, committed with byte provenance for reproducible installs.

An isolated second consumer runs with `npm ci --prefix frontend && npm run build:example --prefix frontend`, then `GOWORK=off go run ./examples/fake-controlplane -addr 127.0.0.1:18543`. It renders real fixture widgets/panels using reviewed bytes and shared React; unload revokes frontend/style leases. `npm run typecheck --prefix frontend`, `npm test --prefix frontend`, and `npm run build --prefix frontend` validate adapters. Browser checks require the built fake-consumer binary at `.scratch/fake-controlplane` and Playwright Chromium.

Scope limits: Folio artifacts are proposed wiring, with no upstream preset edit. Tachyon adoption remains unimplemented. The optional reviewed frame consumer (`/?frames=1`, proof ports 18543/18544) integrates shared verified-byte isolation with exact document policies; see [frame delivery and containment limits](docs/frame-delivery.md). There is no implicit main-origin fallback.

Linux environments missing Chromium system libraries may install browser dependencies through Playwright in CI. Local verification used a repo-local extracted `libasound2t64` and `LD_LIBRARY_PATH` in ignored `.scratch`; no system package or service was changed.

Optional controlled admin fixture: `/?admin=1` exercises existing kit-admin/settings/observe with app-owned snapshots, provenance, setup and held intent-only outcomes. See [the small lifetime adapter and integration boundaries](docs/controlled-admin.md).

Optional observation fixture: `/?observations=1` renders actual kit-observe health/stat/diagnostic and opt-in exact-sample chart components with fixed time, retained evidence and held scripted producers. See [controlled observation ownership and proof](docs/controlled-observations.md).

Optional developer/workflow fixture: `/?developer=1` exercises actual private licensed kit-code/workflow candidates with controlled file/node selection, inert drafts and held inspector retirement. [Compatibility, optional entry ownership and limits](docs/controlled-developer-review.md).

Optional voice/media fixture: `/?voice=1` uses actual controlled kit-voice candidates with local authored silence playback, voice/segment selection and held preview retirement. [Compatibility, disabled capture and ownership limits](docs/controlled-voice-media.md).

Optional controlled shell fixture: `/?shell=1` composes actual AppShell/DetailPageLayout/OverlaySidebar around embedded records and real admitted plugin views. [State retention/reset, scroll/focus and ownership proof](docs/controlled-shell-layout.md).

Optional deterministic playback fixture: `/?playback=1` aligns actual plugin props/action invocation to one authored cutoff snapshot with manual clock controls and held producer retirement. [Projection, remount and cleanup policy](docs/controlled-playback.md).

Optional dashboard composition fixture: `/?dashboard=1` adds actual released dashboard panels with cutoff counts, explicit zero/uncollected evidence and controlled plugin composition. [Retention, evidence scope and style ownership](docs/controlled-dashboard.md).

Optional controlled overlay fixture: `/?overlays=1` exercises actual form/confirmation/menu components with transient drafts, guarded native submit and owner/context/source retirement. [Focus, local outcomes and lifecycle policy](docs/controlled-overlays.md).

Optional evidence inspector: `/?inspector=1` composes actual read-only JSON/summary/metadata/search components with cutoff-bounded local records and contribution-scoped selection/modal retirement. [Supported exports, focus and lifecycle proof](docs/controlled-inspector.md).

Optional controlled compact widgets: `/?widgets=1` composes six published exports over authored cutoff-bound samples and actual contribution lifetime. [Truthful counts, proportions, accessibility and retirement proof](docs/controlled-widgets.md).

Optional desired-settings review: `/?settingsReview=1` compares four actual kit-settings renderers with local drafts/steps and held plan-only preview. [Validation, provenance, unset and contribution lifetime](docs/controlled-settings-review.md).

Optional account metadata review: `/?accountReview=1` uses five exact licensed kit-account exports with fictional offline identity/access records and held local candidate inspection only. [Native validity, no-effect boundaries and contribution lifetime](docs/controlled-account-review.md).

Optional conversation response review: `/?conversationReview=1` composes four released chat exports with fixed records/raw priors, bounded supplied-history scrolling and held local response-candidate inspection. [Native input, awaited responders, no-effect boundaries and contribution lifetime](docs/controlled-conversation-review.md).

Optional observation retry review: `/?observationReview=1` independently reviews four pinned observation exports with authored receipts/windows, manual clock and contribution-fenced local retry inspection. [Evidence semantics, exact-sample geometry and lifetime limits](docs/controlled-observation-review.md).

Optional declared-admin review: `/?adminReview=1` renders read-only admin navigation/content tied to the current admitted contribution; `/?adminShellReview=1` mounts the same authored projection in one standalone shell. [Canonical destinations, evidence states and lifetime policy](docs/controlled-admin-review.md).

Optional controlled Run Explorer: `/?explorerReview=1` composes the published operations table/filter components with a bounded authored prefix, exact receipt joins and readonly contribution-fenced inspection. [Counts, scrolling, native focus and retirement policy](docs/controlled-explorer-review.md).

Optional controlled developer evidence: `/?developerEvidence=1` reviews ten exact kit-code exports over an immutable authored offline test/file/stack/commit snapshot with native navigation and contribution-fenced readonly inspection. [Progress, timestamp, source and lifecycle boundaries](docs/controlled-developer-evidence.md).

Optional controlled workflow review: `/?workflowReview=1` independently reviews seven exact canvas exports with native readonly graph navigation, separate decorative connection specimens and contribution-fenced inspection. [Authored evidence, geometry and lifecycle boundaries](docs/controlled-workflow-review.md).

Optional controlled conversation evidence: `/?conversationEvidence=1` reviews twelve released tool/explanation/provenance exports over a separately authored temporal snapshot with contribution-fenced readonly inspection. [Value, disclosure, provenance and lifetime boundaries](docs/controlled-conversation-evidence.md).

Optional controlled usage evidence: `/?usageEvidence=1` reviews twelve released Context/Artifact exports with unknown model capacity, exact authored USD and a contribution-fenced readonly receipt preview. [Receipt, capacity, focus and lifetime boundaries](docs/controlled-usage-evidence.md).

Optional current contribution workbench: `/?contributionWorkbench=1` separates actual runtime metadata/refusals from declared catalogue policy and offers current eligible widget/panel slot previews. [Readonly selection and lifetime policy](docs/controlled-contribution-workbench.md).

Optional readonly authored directory: `/?directoryReview=1` composes fifteen installed Card/Tabs/Badge/Popover exports with supplied fictional relationships and actual contribution-scoped presentation lifetime. [Snapshot, native focus and no-auth boundaries](docs/controlled-directory-review.md).

Optional authored operations metrics: `/?opsMetrics=1` composes four installed dashboard exports with native tabs, exact raw metric companions and actual contribution-fenced readonly inspection. [Metric truthfulness, focus and lifecycle boundaries](docs/controlled-ops-metrics.md).

Optional inline current contribution selector: `/?contributionSwitcher=1` uses eight installed Command exports for native keyboard filtering and eligible declared-slot readonly previews. [Native authority, focus and lifecycle boundaries](docs/controlled-contribution-switcher.md).
