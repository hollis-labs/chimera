# Controlled administration integration

Chimera's optional `createAdminPresentationSession(contextKey, sourceKey, channels)` is a local presentation lifetime fence. It neither resolves settings nor validates wire manifests. Pass a finite app-owned list of channels, such as `read:appearance`, `intent:appearance`, and `setup`. `begin(channel)` supersedes that channel's previous request and returns `{signal, commit(callback), cancel()}`. Different channels retain independent lifetimes. Commit accepts only a synchronous local state update, consumes the ticket once and returns false when retired. A superseded ticket's cleanup cannot cancel its replacement.

On authorized context or source/revision retirement, call `reset(nextContextKey, nextSourceKey)` and synchronously clear old snapshots, observations, drafts, transient secret inputs and outcomes in the app. Same-identity reset is a no-op. `dispose()` is terminal and idempotent. A signal does not prove a backend operation was cancelled or rolled back: held producers may ignore it. Always put the actual state commit behind the ticket, rather than checking cancellation only before starting work. Do not launch asynchronous effects inside `commit`.

```ts
const lifetime = createAdminPresentationSession(contextKey, sourceKey, ['read:appearance'])
const ticket = lifetime.begin('read:appearance')
const projection = await appRead(ticket.signal) // app validates/sanitizes its wire response
// The callback must synchronously replace only this controlled projection.
ticket.commit(() => replaceAppearance(projection))
```

Render the existing published `AdminContent` inside the application's single viewport shell, with `AdminNavigation` or app-owned navigation. Maintain matching `contextKey` and `discovery.contextKey`; that existing kit fence hides data from a retired principal. Use the actual `AdminContentProps`, `SettingsDraft`, `SettingsChanges`, wizard check/result and observation types. Omit `settingsActions`, `setup` and `setupContext` for read-only presentation; the existing `ReadOnlyAdmin` adapter preserves this omission.

`controlledAdminFixture(contextKey, nowMs, sourceKey)` is an explicit example, not a default policy or backend client. It exports a controlled props store, receipt store, navigation/scenario methods, `reset`, `dispose` and `releaseNext`. All manifests, snapshots, channel allocation and draft/intent decisions are app-owned. Callbacks record save/reset/validate/apply or setup intentions; outcomes are held until explicit release, without timers. Save and setup completion report fixture rejection instead of Saved. Reset/apply never resolve fallback values, clear pending restart metadata or restart anything. There are no secrets in this fixture; apps with secrets must enforce transient draft handling separately and never copy replacements into receipts or persistence.

The fixture supplies default/env/file/override sources explicitly, snapshot-restricted env locks and deployment-file read-only reasons, plus independent field pending-restart and app-reconciled apply metadata. Defaults in schema do not create values. Per-group errors suppress only that resource. Failed first discovery hides declarations; retained refresh failure preserves labelled evidence and disables actions. Status/Diagnostics show observations independently of desired Settings, preserving last successful timestamps during refresh failure. The supplied clock is controlled for reproducible stale evidence.

Run the example at `/?admin=1` on the isolated proof consumer. Its scenario controls demonstrate ready, initial failure, retained declaration failure, group failure, observation refresh failure, read-only omission, setup and staleness. Context/source changes reset props and fence held outcomes, including old captured callback references. Setup uses the actual wizard with app-owned step, checks and results. Keyboard Next, locked inputs, semantic regions, narrow layout and computed component padding are browser checked; live screen-reader speech is not claimed.

Exact released dependencies remain `kit-admin@0.1.0`, `kit-settings@0.2.0`, `kit-observe@0.1.1`, `design-components@0.4.0` and React/ReactDOM19.3.0, with the committed lockfile. Their published declarations contain extensionless relative re-exports; this frontend uses TypeScript `moduleResolution: Bundler` with `module: ESNext` to resolve actual kit types, and compile-time assertions reject accidental `any` erosion. CSS registers each package owner and the existing token theme. The frame candidate, loader, generation and CSS lease contracts are unchanged.

No authentication engine, configuration mutation endpoint, persistence, restart, provider execution or wire schema is introduced. Folio/Tachyon adoption and Parallax's product-specific drafts, permissions, manifests and snapshots remain separate work.
