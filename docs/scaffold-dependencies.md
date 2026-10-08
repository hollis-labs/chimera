# Reproducible scaffold dependency strategy

This is the distribution contract for the accepted `389155313ee5b95f4125e64b61077ddf4257e3d6` implementation. It does not publish npm packages, upgrade Parallax or edit Folio. CW-20261008-0057 documents the seams; CW-20261008-0058 proves the fresh minimal root/subpath consumer. Folio0109 follows that proof and the accepted whole-app milestone sequence. Folio remains a renderer/materializer: no implicit install/build/run/update or implemented sync is introduced.

## Shell-only default

Use the public Go module and released GUI packages. There is no registry, subprocess, private host-ui archive or Chimera frontend adapter requirement for a plain AppShell application.

| Dependency | Exact accepted pin | Use |
| --- | --- | --- |
| Chimera Go | `v0.0.0-20261008115211-389155313ee5` | `github.com/hollis-labs/chimera/host`; published Git commit, not a tagged release |
| go-webui | `v0.2.0` | Consumed transitively by host; do not substitute the older Folio default |
| plugin-host | `v0.1.3-0.20261004183918-98a79bdee1c4` | Current module graph, optional process inventory |
| plugin-sdk | `v0.6.2-0.20261004032349-e4d8eef24b04` | Current module graph, registry/protocol 2; v0.6.1 is not interchangeable |
| Go | `1.26.6` | Accepted module/toolchain floor |
| React / React DOM | `19.3.0` | Current tested browser runtime pair |
| design-components / design-app-runtime / design-tokens | `0.4.0` | Released shell components, shell-reset and theme/source CSS |
| kit-dashboard / kit-chat | `0.4.0`, only as needed | Released screen composition, not mandatory for every shell |
| Tooling | Node 22, Vite `7.3.6`, TypeScript `5.9.3`, Tailwind / Vite plugin `4.3.3` | Current tested consumer toolchain; exact lock records transitive resolution |

Commit resolved `go.mod`, `go.sum`, `package.json` and npm lock. Do not use `@latest`, committed `replace`, `go.work` or absolute workspace paths. Existing consumers keep their own pins until intentionally updated. [The exact dependency audit](dependency-matrix.md) records compatibility and optional candidates; the baseline lock is the tested transitive source of truth.

A complete Go bootstrap can start with the placeholder before frontend assets exist:

```go
package main

import (
    "context"
    "log"
    "net"
    "os"
    "os/signal"

    "github.com/hollis-labs/chimera/host"
)

func main() {
    ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt)
    defer cancel()
    h, err := host.New(host.Config{Name: "review-shell", BasePath: "/review"})
    if err != nil { log.Fatal(err) }
    listener, err := net.Listen("tcp", "127.0.0.1:18543")
    if err != nil { log.Fatal(err) }
    if err := h.Serve(ctx, listener); err != nil { log.Fatal(err) }
}
```

In a **new disposable consumer directory**, write that file and resolve the public pin:

```sh
go mod init example.com/review-shell
GOWORK=off go get github.com/hollis-labs/chimera/host@v0.0.0-20261008115211-389155313ee5
GOWORK=off go build ./...
GOWORK=off go run .
```

After the SPA build exists, pass `fs.Sub` over the app's embedded `dist` directory as `Assets`, keep Vite `base` aligned with `BasePath`, and supply app API handlers explicitly. Use one AppShell with explicit scroll regions, import theme CSS once, register component `source.css`, and import shell reset once for the selected shell entry. This Go bootstrap compile is documentation-level validation; clean npm install, actual shell CSS/native navigation, embedded build and both root/subpath conformance belong to 0058 rather than being claimed from this snippet.

## Explicit opt-in plugin frontend

The private `chimera-presentation-adapters` package is not an npm release, and `@hollis-labs/plugin-host-ui@0.1.0` is not published. A generated app must not accidentally resolve either from another checkout. The reproducible candidate strategy is an explicit **source/archive snapshot**, distributed as part of the opt-in recipe:

1. Obtain a clean archive of exact Chimera commit `389155313ee5b95f4125e64b61077ddf4257e3d6`. Retain its MIT license, the chosen `frontend/src` adapter bytes and a manifest of original paths/hashes. Keep adapters under a clearly identified vendor namespace; build them with the consuming frontend. App policy/catalog/routes live outside that snapshot. No copied Go host implementation is included.
2. Carry the identical `third_party/hollis-labs-plugin-host-ui-0.1.0.tgz`, SHA-256 `360c4bd74df7369d57af74151bba0ff0739b31b5c67499f1c01c15cefb4b24b0`, its complete MIT terms and [provenance](../third_party/README.md). Runtime source is design-kit `dbcf4fa7f5bcfe83686d227b39ddf9426cea4fe5`; the candidate's standalone compilation adaptation is recorded. Pin it by a consumer-relative `file:` path and verify its checksum before installation. This is candidate supply, not npm publication.
3. Pin released registry `@hollis-labs/plugin-registry@0.2.0` and the approved singleton React/runtime versions in the lock. Provision native importmaps with the candidate `/vite` entry and explicit permitted exports; externalize the same specifiers when building reviewed plugin bundles. Register candidate and exact plugin utility source scans. Retain owner/generation CSS leases.
4. Declare one application/context runtime, catalogue, routes, visible slots, storage and explicit isolation policy. Reviewed main-origin fixture code is an opt-in authority choice. For opaque frames, supply the reviewed shared artifact/bootstrap build and exact app-origin/document policy from [frame delivery](frame-delivery.md); no fixed proof origin becomes a production default. Missing controller/policy remains a named refusal.
5. Record the original commit, adapter file hashes, candidate/license digest and generated app lock together in a scaffold provenance file. Upgrade by an explicit reviewed snapshot replacement and rerun conformance; Folio sync remains deferred. Full source-snapshot materialization and emitted-consumer checks are 0058 acceptance, not completed by this document.

The baseline complete `frontend/src` entry also exports optional controlled admin/observation fixture helpers. An opt-in recipe must list exactly which dependency closure it carries; it cannot claim a minimal registry-only package while importing kit-admin/settings/observe implicitly. Optional code/workflow/voice/account candidates are not part of the shell or basic plugin default. Each would require its own unchanged archive/license/provenance and explicit optional entry.

## Generated-consumer acceptance

Folio thin templates consume maintained packages/snapshots rather than defining another loader, host, schema or scheduler. Required evidence is: a clean temporary render and `.folio.yaml` inputs/layer/file digests; placeholder Go build before frontend output; exact root and declared subpath asset/navigation/API/plugin behavior without `//`; npm clean install/typecheck/lint/build and embedded Go compile; native desktop/390px shell navigation, focus and scroll; and applicable Folio preset/conformance/platform-pin drift checks. No service/provider requirement, package publication, Tachyon migration or automatic update is implied.
