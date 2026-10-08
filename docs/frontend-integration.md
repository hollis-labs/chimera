# Typed presentation integration

Current contract and distribution entry points: [consumer matrix](consumer-contracts.md), [scaffold dependencies](scaffold-dependencies.md), and [verified frame delivery](frame-delivery.md). Frontend adapters are maintained private TypeScript source, not a published npm package. The pinned host-ui archive is an explicitly unpublished licensed candidate.

`frontend/src/runtime.ts` connects the real published registry-v2 loader to the shared host-ui candidate. Raw JSON text is preserved at the wire boundary. The app supplies the catalog, kind/region descriptors, scope, approved exports, explicit isolation and action policy; this adapter does not define a competing loader or manifest.

`frontend/src/example.ts` is a complete widget/panel recipe. The example chooses main-origin explicitly for reviewed offline demo bytes. `frontend/src/actions.ts` confines navigation to local route identifiers and refuses command/modal effects. Shared `dispatchPluginAction` remains the gateway: tests prove declared navigation, forged payload refusal and stale owner fencing. Production caller/capability/business authorization belongs to consumers.

`frontend/src/stylesheets.ts` adapts shared registry stylesheet hooks to the candidate's owner/generation leases. The host resolver binds declared URLs to reviewed generations. Replacement/unload releases leases; links created outside these leases remain owned by the host. The isolated consumer browser test verifies stylesheet removal while its host CSS survives.

`frontend/src/admin.tsx` uses the published kit-admin AdminContent inside an existing shell, with controlled discovery/selection/provenance/observation props. It excludes writer and setup callbacks and copies only approved props. SSR tests demonstrate context fencing and that missing observations display unavailable. There is no settings transport or command dispatcher.

The Vite example explicitly exports approved React names through pluginHostImportmap and uses native importmaps. Plugin bundle imports are externalized; the registry imports the exact digest-verified bytes. Its real useState widget and detail panel render in Chromium without a second React runtime. Theme CSS is imported once. The example is an integration proof; production design-kit token/source scanning and application composition remain app-owned.

Verified opaque frame delivery is implemented through `createIsolatedComposition`, the shared `/isolation` importer/controller and optional Go `host.NewFrameDocuments`. CW-20261004-0106 is complete with actual document policies, verified runtime bytes, revocation/action/browser proofs and fifteen upstream mechanism groups. Applications must supply reviewed runtime artifacts, document admission, parent origins and effective-mode policy. Selecting sandboxed-frame without that controller still reports `isolated-controller-required`; it never falls back to main-origin. See [delivery, policy and containment limits](frame-delivery.md). Same-origin demo rendering remains a separate explicit fixture policy.

Run the isolated second consumer:

```sh
npm ci --prefix frontend
npm run build:example --prefix frontend
GOWORK=off go run ./examples/fake-controlplane -addr 127.0.0.1:18543
```

Visit the printed address. API provider records, widget/panel and local counter are fake fixtures. The consumer neither contacts Tachyon nor imports its provider implementation. No managed service or source was changed.

Registry-v2 stylesheet sink keys include an opaque host-epoch/owner/generation tuple. The bridge treats the key as opaque and asks host policy to map the declared URL to a reviewed owner/generation; it does not confuse the key with a plugin owner ID. The example allowlists its exact fixture stylesheet URL.

The maintained proof now also provisions the app-approved `@chimera/ui` Button export from design-components. Both production root and Vite development `/proof/` use the same native importmap contract. Browser tests exercise real React hooks through that Button, assert mapped React/design runtime URLs, verify Tailwind plugin source scanning yields nonzero padding, and remove owner-generation styles without touching host theme CSS. The example imports Tailwind v4, theme CSS once, design-components/source.css and plugin-host-ui/source.css, plus its exact Go-authored fixture plugin source.

`readOnlyAdminFixture(contextKey, nowMs)` supplies typed kit-owned projections for desired settings/provenance, runtime health and diagnostics. Tests cover all three sections, stale observations, unavailable resources, unsupported admin contract and mismatched principal context. No writer or setup callback is exposed.

## Controlled routes, layouts and fixture actions

`createPresentationComposition` composes the existing shared catalogue, registry runtime, ordering and layout store. The consumer supplies its complete kind/region catalogue, explicit isolation, app routes, scoped storage and action adapter. Route IDs belong to the application; canonical local paths are validated before the host starts. Reserved identities and metadata projection are explicit application policy. `select(region)` checks current authority before applying shared saved order/visibility. No plugin registers the global router or viewport.

`createFixtureActions` supplies application policy to the shared `dispatchPluginAction` authority. Its routes, modal regions, reviewed command IDs and argument validators are allowlists. Modal state holds pinned source/target refs; `observe(runtime)` clears the modal on either authority withdrawal. The adapter owns only local navigation, presentation state and labelled simulation receipts. It provides no business executor, provider action or managed service control.

For deterministic demonstrations, `wait(command, signal)` and `validateWait(intent, signal)` can gate playback. The shared dispatcher aborts source/target/scope/invocation/caller changes; the adapter checks that signal and its instance epoch before committing outcomes. A producer which ignores cancellation cannot update receipts after the gate resolves. Scope/invocation changes reset transient state. Observers return independent cleanup leases so an older cleanup cannot revoke a newer binding. Dispose the action instance and composition on application context retirement.

`frontend/src/routing-example.ts` is an app policy example, with page/widget/panel, declarative toolbar/navigation and reviewed simulation handler regions. Its names and fixture data are not a new shared vocabulary. `frontend/example/main.tsx` renders this instance through the shared host provider/action hook and design-components controlled DetailDialog. Context switches abort unfinished registry fetches, dispose the old host before loading the next one, and guard both async startup and displayed intent results. The runtime remains the sole import/admission controller. Main-origin is an explicit reviewed fixture policy; choosing sandbox isolation without a controller refuses component surfaces.

The fake consumer's optional import-error registry is a second, fully reviewed transaction. The actual verified bundle throws during import; the upstream loader reports activation-failed and retains unchanged healthy entries. Render-error fixtures use the shared render boundary. Browser tests assert local hook state survives unrelated import/render failures and layout reordering, owner unload fences component and modal state, changing context refreshes render props, and delayed fixture outcomes cannot contaminate the next context.
