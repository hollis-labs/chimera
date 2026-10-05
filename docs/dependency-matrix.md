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
