# Typed presentation integration

`frontend/src/runtime.ts` connects the real published registry-v2 loader to the shared host-ui candidate. Raw JSON text is preserved at the wire boundary. The app supplies the catalog, kind/region descriptors, scope, approved exports, explicit isolation and action policy; this adapter does not define a competing loader or manifest.

`frontend/src/example.ts` is a complete widget/panel recipe. The example chooses main-origin explicitly for reviewed offline demo bytes. `frontend/src/actions.ts` confines navigation to local route identifiers and refuses command/modal effects. Shared `dispatchPluginAction` remains the gateway: tests prove declared navigation, forged payload refusal and stale owner fencing. Production caller/capability/business authorization belongs to consumers.

`frontend/src/stylesheets.ts` adapts shared registry stylesheet hooks to the candidate's owner/generation leases. The host resolver binds declared URLs to reviewed generations. Replacement/unload releases leases; links created outside these leases remain owned by the host. The isolated consumer browser test verifies stylesheet removal while its host CSS survives.

`frontend/src/admin.tsx` uses the published kit-admin AdminContent inside an existing shell, with controlled discovery/selection/provenance/observation props. It excludes writer and setup callbacks and copies only approved props. SSR tests demonstrate context fencing and that missing observations display unavailable. There is no settings transport or command dispatcher.

The Vite example explicitly exports approved React names through pluginHostImportmap and uses native importmaps. Plugin bundle imports are externalized; the registry imports the exact digest-verified bytes. Its real useState widget and detail panel render in Chromium without a second React runtime. Theme CSS is imported once. The example is an integration proof; production design-kit token/source scanning and application composition remain app-owned.

Verified opaque frame delivery is not implemented here. Selecting sandboxed-frame without a verified controller reports isolated-controller-required; it never falls back to main-origin. Candidate /isolation APIs exist, but adding an actual verified-byte frame controller/browser matrix remains CW-20261004-0106. Same-origin demo rendering is not an isolation claim.

Run the isolated second consumer:

```sh
npm ci --prefix frontend
npm run build:example --prefix frontend
GOWORK=off go run ./examples/fake-controlplane -addr 127.0.0.1:18443
```

Visit the printed address. API provider records, widget/panel and local counter are fake fixtures. The consumer neither contacts Tachyon nor imports its provider implementation. No managed service or source was changed.

Registry-v2 stylesheet sink keys include an opaque host-epoch/owner/generation tuple. The bridge treats the key as opaque and asks host policy to map the declared URL to a reviewed owner/generation; it does not confuse the key with a plugin owner ID. The example allowlists its exact fixture stylesheet URL.

The maintained proof now also provisions the app-approved `@chimera/ui` Button export from design-components. Both production root and Vite development `/proof/` use the same native importmap contract. Browser tests exercise real React hooks through that Button, assert mapped React/design runtime URLs, verify Tailwind plugin source scanning yields nonzero padding, and remove owner-generation styles without touching host theme CSS. The example imports Tailwind v4, theme CSS once, design-components/source.css and plugin-host-ui/source.css, plus its exact Go-authored fixture plugin source.

`readOnlyAdminFixture(contextKey, nowMs)` supplies typed kit-owned projections for desired settings/provenance, runtime health and diagnostics. Tests cover all three sections, stale observations, unavailable resources, unsupported admin contract and mismatched principal context. No writer or setup callback is exposed.
