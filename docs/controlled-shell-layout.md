# Controlled shell/layout composition

The optional isolated consumer at `/?shell=1` composes released design-components0.4.0 AppShell, DetailPageLayout and OverlaySidebar with the unchanged shared registry/runtime/catalog/layout/action APIs. Existing contracts suffice: there is no new shell framework, loader, layout store or host adapter.

One viewport AppShell accepts app-owned navigation/header slots. DetailPageLayout provides the single main scroll body and a pinned selected-view heading. This proof needs no separate detail aside. The app explicitly imports released design-app-runtime0.4.0 `shell-reset.css` in its lazy shell stylesheet; the actual document reset is the shell's precondition, not a competing renderer. This direct dependency uses already-locked transitive bytes. Optional shell CSS stays out of the default document-shaped consumers.

The desktop rail and narrow OverlaySidebar contain application destinations and the admitted plugin navigation contribution. Plugin navigation dispatches through the existing shared action hook and host policy; plugins never register viewport routing or global destinations. The app owns route selection, overlay open state and stack/grid choice. OverlaySidebar/Sheet supplies focus containment, Escape and trigger focus return. The explicit skip-to-content link focuses the current view heading. The overlay screenshot waits for completed transition geometry and opacity; browser checks resolve its elevated background and foreground tokens.

## State and lifecycle policy

The same keyed widget parent survives stack/grid arrangement, shared ordering and explicit layout reset; its React hook state and unrelated panel state remain intact. The app's reset button invokes the existing layout store's reset plus its own arrangement reset. Hiding a widget intentionally unmounts it: showing it starts fresh local state. Closing/reopening a panel or changing selected destination also intentionally remounts its local state. This is controlled fixture policy, not a universal session-preservation rule.

Context replacement retires the old runtime before constructing a new one and creates new scoped layout storage. Route, arrangement, visibility/order, panel selection and fixture hook state reset. Abort/epoch/current-host checks fence initial and subsequent registry failures and dispose abandoned hosts. Tests hold real registry requests, replace contexts and release failures; old hosts cannot revive surfaces or error presentation.

Owner unload removes actual widget/panel/navigation surfaces and its generation stylesheet while embedded records and the unrelated stable plugin retain their state. Context replacement disconnects the actual old stylesheet element and admits one fresh current lease. CSS/theme assets owned by the host survive plugin withdrawal. Runtime/catalog admission, renderer boundaries and generation integrity remain shared; no local loader or plugin manifest schema is added.

## Proof and boundaries

Eight additional Chromium cases render the existing Go-authored reviewed fixture through the real shared importmap/runtime and component renderers. They cover retained versus reset local state, shared layout order/visibility/reset, plugin navigation, unload/CSS cleanup, context reset, two unfinished-fetch retirement paths, keyboard focus, completed overlay token styling and narrow main-scroll ownership. The viewport/document stays fixed while the selected main region scrolls to the final authored record; rail/header stay pinned. Widget labels wrap on narrow surfaces through app-owned token styles. Published kit/core and existing candidate pins are unchanged.

The plugin fixture explicitly chooses reviewed main-origin rendering. This shell proof does not change the verified-frame adapter or imply a fallback from isolated policy. Provider observations and shell records are local read-only fixtures. No backend/business action, provider, persistence, source migration, Folio preset or Tachyon adoption is implemented. Existing frame/admin/observation/action/voice/lifecycle checks remain part of public CI.
