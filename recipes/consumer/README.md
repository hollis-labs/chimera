# Minimal distributable consumer recipe

**Frozen compatibility recipe:** this exports the accepted `3891553` baseline and its original Go dependency graph. It does not adopt Chimera v0.1.0 or its consolidated registry types. For the current Go API and release pin, use the root README; a recipe upgrade must update its module pin, template imports and conformance expectations together.

Finite consumer recipe for CW-20261008-0058, not a Folio preset or another framework. Materialization writes only a **new repo-local `.scratch` directory** and performs no hidden install/build/run/publication. Go imports the public host; the frontend uses released AppShell and app-owned native destinations. Records are authored offline evidence, not provider/business observations.

Prerequisites: Node 22+, Go 1.26.6, a Chimera checkout containing immutable Git commit `389155313ee5b95f4125e64b61077ddf4257e3d6`, and network access for dependency installs. CI fetches history; export never falls back to HEAD. No upstream checkout is needed. See [consumer contracts](../../docs/consumer-contracts.md) and [dependency strategy](../../docs/scaffold-dependencies.md).

```sh
node recipes/consumer/materialize.mjs shell my-shell
cd .scratch/my-shell
GOWORK=off go mod tidy
GOWORK=off go build -o app .       # Placeholder builds before frontend output.
npm ci --prefix frontend
npm run typecheck --prefix frontend
RECIPE_BASE=/review/ npm run build --prefix frontend
GOWORK=off go build -o app .       # Embeds the exact frontend build.
./app -addr 127.0.0.1:18543 -base /review/
```

For root use `RECIPE_BASE=/` and `-base /`. SPA base agrees between Vite and Go; API/plugin/health paths remain root-mounted. Before index exists, the shared placeholder handles SPA paths including unknown assets. After building, missing assets are 404 and deep SPA paths receive index. Native Overview/Evidence hash links survive reload/back. One viewport shell contains one `.recipe-main` scroll owner and a pinned footer.

## Explicit plugin variant

Materialize with `node recipes/consumer/materialize.mjs plugin my-plugin-shell`, then use the same commands. Main-origin fixture authority is explicitly reviewed; no opaque isolation, typed-action adapter, business execution, process/provider or optional private kit is claimed.

| Input | Actual distribution |
| --- | --- |
| Public Chimera `v0.0.0-20261008115211-389155313ee5` | Resolved Go module/sum; no copied host, replace or go.work |
| Released UI/tooling | Exact direct pins and selected transitive lock entry values from accepted baseline; no upgrades/latest resolution |
| Baseline `composition.ts`, `runtime.ts`, `store.ts`, `stylesheets.ts` | Unchanged original bytes under `frontend/src/vendor/chimera`, original/local paths and SHA256 manifest, full MIT terms |
| Host-ui private candidate | Identical relative-file archive pin SHA256 `360c4bd74df7369d57af74151bba0ff0739b31b5c67499f1c01c15cefb4b24b0`, source/adaptation provenance, full MIT inside archive and served license asset; no npm release |
| Registry `0.2.0`, settings `0.2.0`, lexer `1.7.0` | Actual registry runtime; settings/lexer satisfy candidate declared peers without mounting settings |
| App fixture JS/CSS | Reviewed inert local useState, SDK registry/digest and maintained Delivery, explicit catalogue/importmap exports/source scans |

`recipe-provenance.json` records distribution inputs. Lock derivation follows actual dependencies/peers and bundled optional declarations; every selected entry equals baseline and npm ci leaves it unchanged. Shell excludes registry/host-ui/code/workflow/voice/account families. No moving source checkout is used. Four adapter files are the complete chosen closure; the broader private adapter package is not claimed as an npm dependency.

The actual shared loader/runtime renders a current eligible WidgetRenderer with one approved React/Button importmap. StrictMode owns abort/dispose and CSS leases. Navigation away retires that local widget; returning starts its counter at zero. Unload removes generation styles while app theme/embedded content survive. Server requests are finite GET metadata/registry delivery; shutdown calls app Stop after HTTP drain. App/adapter/candidate complete licenses remain materialized and embedded.

## Conformance and Folio handoff

After installing root frontend tools/Chromium, run `node recipes/consumer/check.mjs`. It creates fresh unique scratch outputs, clean-installs both variants, verifies exact lock/source/archive/Go checksum, compiles two placeholders and four root/subpath embedded consumers, and runs twelve native desktop/390px/short-height scenarios. Evidence covers real token paint, navigation/heading focus, PageDown/Control+End/last-row viewport/pinned footer, singleton hooks/importmap, computed widget padding and generation stylesheet cleanup, deep reload/back/API prefixes/missing built assets, no external/non-GET effects and signal cleanup. Complete viewport captures/hashes and JSON acceptance are retained. Existing 125 unit/290 application browser/15 frame gates remain separate.

Folio inputs are app/module identity, canonical root/subpath, exact public Chimera/UI/tool pins, embedded placeholder/build path and an explicit opt-in candidate/source manifest. Folio should reuse its own breadcrumb/materialization/pin/conformance machinery, without automatic build/install/run/update or implemented sync. This recipe creates no `.folio.yaml` or upstream adoption. Folio0109 follows accepted app milestones and this consumer proof.
