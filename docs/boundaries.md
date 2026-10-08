# Boundary audit — 2026-10-04

This records the initial source/release audit. Current maintained seams are consolidated in the [consumer contracts](consumer-contracts.md); [exact pins](dependency-matrix.md) and [frame delivery](frame-delivery.md) record subsequent accepted work. Registry/latest-version statements below describe the initial audit date, not a new current lookup.

Chimera owns HTTP assembly, same-origin plugin delivery, app integration adapters and presentation admission. Consumers own inventory, approved binary paths, configuration, secrets/grants, identity and business effects. Tachyon owns serial RPC policies, provider commands, retirement/restart policy and settings writes; these have not migrated.

Verified registry sources: go-webui tags through v0.2.0; plugin-host through v0.1.2; plugin-sdk through v0.6.1. The latest SDK Go tag still has registry v1, while published npm plugin-registry 0.2.0 has registry v2. Pin a pushed SDK commit containing v2 rather than silently translating v1. Source checkout e4d8eef24b049053b473e83709d17ceb2b7f4e0f contains registry v2/protocol v2. plugin-host-ui npm lookup returns E404; its private 0.1.0 tree is a development candidate, never a released package.

Shared plugin-host multiplexes request IDs, preserves exact child environment, uses process groups and bounded Stop, reaps failed starts, and survives startup context cancellation after startup. Tachyon's existing driver is serial, detaches started I/O from browser cancellation with a fresh 120 second bound, and fences captured process identities. Generic plugin-host consumption does not claim those Tachyon call policies; an isolated consumer demonstrates product ownership without upstream migration.

HTTP drain and application Stop each receive a fresh ShutdownTimeout budget (default five seconds), so failed HTTP drain still permits resource cleanup. Overall teardown can take twice that budget plus scheduling overhead. Assets belong to the consumer; no generated frontend is required for Go builds.

Folio owns scaffold distribution. Local integration artifacts can document wiring, but cannot claim an upstream preset was changed. No existing service was deployed, restarted or migrated. No npm package was published.

Go assembly is authored here using go-webui's public API. Shared packages retain their own MIT licenses; no Tachyon implementation was copied.
