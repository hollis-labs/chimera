# Exact dependency audit

Live Go proxy/npm registry and read-only repository source checked 2026-10-04.

| Contract | Consumed pin | Owner / findings |
| --- | --- | --- |
| Embedded SPA | go-webui v0.2.0 | go-webui; released, placeholder and asset cache policy |
| Plugin driver | plugin-host v0.1.3-0.20261004183918-98a79bdee1c4 | plugin-host pushed current remote HEAD; protocol 2, RPCID, terminal unload |
| Subprocess / registry | plugin-sdk v0.6.2-0.20261004032349-e4d8eef24b04 | plugin-sdk pushed commit; protocol 2 and registry 2 |
| Browser registry | plugin-registry 0.2.0 | npm released registry 2 |
| Browser host UI | private 0.1.0 source candidate | design-kit; npm E404, candidate must preserve source digest and license |
| Core components | design-components 0.4.0 | npm published; visual ownership remains design-kit |
| Admin | kit-admin 0.1.0 | npm published; controlled content only, no command authority |

Rejected combinations: plugin-sdk v0.6.1 still exposes registry 1; plugin-host v0.1.2 fails compilation with protocol-2 RPCID. Local plugin-host main 7251757 predates remote protocol-2 work. These source/release differences require the pinned remote commits above; no replace/go.work or shared repository modifications are used.

The current driver defaults differ from historical Tachyon/source documentation: protocol-2 unload is terminal and cleanup executes once; inbound/outbound frames default to 8 MiB. Tests exercise the consumed version, not stale local README claims.

Frame checkpoint registry audit on 2026-10-05 confirms React/React DOM 19.3.0, plugin-registry 0.2.0 and design-components 0.4.0 are the available published versions, matching the existing lock. Frame artifacts/bootstrap use the same exact unpublished candidate; no archive or upstream source change was needed. Frame React/ReactDOM/design/style bytes are produced by the shared builder and verified per realm, with declared inventory choices in `frontend/example/frame-build.ts`.

2026-10-05 controlled-admin follow-up rechecked published npm latest: kit-admin0.1.0, kit-settings0.2.0, kit-observe0.1.1 remain pinned and unchanged. Published extensionless declaration re-exports resolve under TypeScript ESNext/Bundler; negative type-level assertions reject accidental any. No npm candidate/publication or package change was needed.

2026-10-05 controlled-observation follow-up rechecked published kit-observe0.1.1/dashboard0.4.0. The optional chart peer dashboard0.4.0 is now an explicit direct frontend dependency at the same existing lockfile version; no transitive bytes changed. Root observation and chart declarations are resolved with the existing ESNext/Bundler mode and guarded against accidental any. Existing licensed frame candidate remains byte-identical.

2026-10-05 developer/workflow compatibility audit: kit-code and kit-workflow registry lookups return E404; kit-developer/kit-canvas are not source package names. Actual developer exports are kit-code root; graph exports are kit-workflow/canvas. Identical Parallax-built private0.0.0 candidates from the existing dbcf4fa7 snapshot are committed with full MIT AND Apache-2.0 licenses, source hashes and exact archive checksums. Published design-components0.4.0 provides their primitive dependencies. ReactFlow12.10.1 is pinned for the optional canvas; ANSI/Shiki are not consumed by this proof. Actual Vite root-entry module-graph checks exclude all three optional dependency families. Existing runtime/CSS lease/session bytes are unchanged.
