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
