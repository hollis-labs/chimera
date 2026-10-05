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
