# Proposed Folio integration wiring

This is a reviewable integration artifact. Folio's managed presets were not modified; upstream adoption remains a separate follow-up.

Use the [current consumer contracts](../../docs/consumer-contracts.md) and [shell-only versus opt-in plugin dependency strategy](../../docs/scaffold-dependencies.md). This directory is guidance, not a Folio `preset.yaml` or a completed generated-consumer adoption. CW-20261008-0058 proves the minimal recipe before Folio0109; the latter is separately sequenced after the accepted application milestones.

Starting from Folio `app-dashboard` or `chat-app`, retain the app-owned embedded asset directory and `fs.Sub` (the current Folio templates use `internal/webui/dist`). Replace local SPA assembly with:

```go
h, err := host.New(host.Config{
  Name: appName, Assets: dist, Routes: fixtureMux,
  Plugins: admittedDelivery, Stop: inventory.Stop,
})
err = h.Serve(ctx, listener)
```

Import `github.com/hollis-labs/chimera/host` and `/plugins`, pin a pushed Chimera Go pseudo-version, and commit its go.sum. API/plugin handlers receive original prefixes. Start reviewed inventory before opening the listener. Scope discovery, exact child env/config/grants, identity and product commands to the consuming app. A pure UI lab does not need subprocess backends.

Frontend provisioning uses a licensed, digest-recorded plugin-host-ui candidate until publication. Import `pluginHostImportmap` from its `/vite` entry, list explicit runtime exports, externalize those same specifiers in plugin builds, and import theme CSS once. Register package source.css scan paths. Use shared registry v2/browser loader and host-owned catalog regions; do not invent a loader. Mount AdminContent inside the existing shell with controlled read-only props.

A generated preset must prove a clean checkout build without frontend output, root/subpath API mounting, placeholder behavior and no service requirement before it can land upstream.
