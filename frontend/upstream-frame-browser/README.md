# Licensed upstream frame acceptance harness

MIT test sources copied from hollis-labs/design-kit commit `dbcf4fa7f5bcfe83686d227b39ddf9426cea4fe5`, `packages/plugin-host-ui/test/browser/{client.ts,run.mjs}`. The existing candidate archive remains in `third_party/`; the upstream MIT notice is preserved in this directory as `LICENSE`. No upstream checkout was modified or built.

Adaptations are limited to imports targeting the exact installed candidate, the package root/client path, and forcing temporary files into Chimera `.scratch`. Test assertions and hostile packet instrumentation are unchanged. This harness intentionally exposes test-only port handles in its own ephemeral browser context; the application integration does not expose those handles. Its fixture document transport is test-only. Chimera's actual reviewed-template HTTP delivery has separate Go and browser tests.

Run `npm run test:upstream-frames`. This checks the pinned upstream Chromium mechanisms, including hostile window/port packets, cancelled/uncertain effects, mode changes, cleanup failures and observed self-navigation egress. It does not establish universal egress prevention, CPU/memory containment, signatures or production policy approval.
