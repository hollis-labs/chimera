# Changelog

## Unreleased

- Go toolchain 1.26.10 (`go` directive and CI pin) for GO-2026-6809 (crypto/x509); no behavior change.
- A plugin entry in `chimera.json` may carry a `config` object of string settings, handed to the plugin in `plugin/init` next to the host's own `ingest_url` and `ingest_token`. Those two keys belong to the host: an entry that sets either is refused at startup. Entries without `config` behave as before. (CW-20261017-0047)

## v0.1.0 — 2026-10-09

- First tagged Go release of the embedded SPA/HTTP assembly, reviewed registry delivery and plugin process inventory.
- Adopt released `libs/plugin-mcp v0.1.1` SDK/host packages and `libs/ui-go v0.1.0` webui. Public registry and inventory APIs now use those consolidated package identities.
- Require Go 1.26.9. Preserve exact child environments, reviewed bundle validation, generation fencing and bounded HTTP-first shutdown.
- Frontend dependencies and private candidate archives are unchanged. The historical consumer recipe remains explicitly pinned to its accepted baseline.
