# Delivery checkpoint

Public repository: https://github.com/hollis-labs/chimera (MIT).

Compatible host API first pushed in 5e6523f; protocol-2 lifecycle/registry in 56ddc2d; typed frontend/isolated consumer in e8327a9; runtime/source-scan/admin matrix in d69620d. Public checks for implementation commits passed. Current proof includes an exact spacing-token check for the Go-authored plugin fixture source.

Validation:

- GOWORK=off Go vet and race tests pass, including real process admission/stop/failed-start, HTTP drain/mounting and registry integrity/revocation cases.
- Consumed driver pluginhosttest TestConformance and TestLifecycleConformance pass under race instrumentation, zero waivers (R01-R27). Inventory adaptation has separate focused tests; this does not assert a new independent driver.
- Six frontend integration tests and strict typecheck/build pass, using actual published registry/kit-admin and licensed identical private host-ui candidate.
- Two Chromium checks pass: production root and Vite development /proof/, real Button/useState widget + detail panel, importmap runtime sharing, exact source-scanned spacing and generation stylesheet cleanup. Browser scratch/libs/temp output stays repo-local.
- Clean git archive builds Go without generated frontend; its independent npm ci/typecheck/build resolves only tracked package pins and committed candidate bytes. No replace/go.work or parent workspace dependency is used.

| Torque task | Status / boundary |
| --- | --- |
| 0099–0104 | Done: source/version audit, scaffold, HTTP host, process inventory, reviewed registry delivery, runtime/CSS provisioning |
| 0105 | Partial doing: widget/panel and catalogue adapter work; broader navigation/layout/reserved/error/context matrix remains |
| 0106 | Backlog: verified-byte opaque frame controller/delivery remains; default sandbox refusal is implemented |
| 0107 | Partial doing: typed gateway/navigation/refusal/stale lease checks; fixture modal and late-outcome matrix remain |
| 0108 | Done: actual controlled read-only admin settings/provenance/status/diagnostics and unavailable states |
| 0109 | Backlog: local Folio wiring artifact only; no upstream preset or materialization/render-compile adoption claimed |
| 0110 | Done: corrected Parallax shared-loader/plugin browser CI and isolated fake control-plane consumer proof pass; actual Tachyon adoption remains outside scope |

No managed service, provider, shared library checkout, Tachyon or Folio source was modified. No npm publication or deployment occurred. Main-origin is an explicit reviewed offline demo choice. Tachyon's product-specific serial cancellation/retirement/restart policies remain consumer-owned and have not migrated.

Two-consumer evidence: Parallax commit `52f21aa41d6ec6a406d6de88e43bc233c58f93ec`, [seven passing browser checks](https://github.com/hollis-labs/parallax/actions/runs/37233861893); isolated Chimera consumer commit `30ff1863081300f3eb44c568646aa20a172dcbc5`, [Go/frontend/production+development browser checks](https://github.com/hollis-labs/chimera/actions/runs/37233871187). Parallax consumes a pushed Go pseudo-version. These checks establish embedded UI and real admitted widget/panel reuse, owner unload and runtime sharing; they do not assert actual Tachyon integration.
