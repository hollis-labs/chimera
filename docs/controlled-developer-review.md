# Controlled developer and workflow review

The optional isolated consumer at `/?developer=1` uses actual kit-code FileTree, CodeBlock and StackTrace, and kit-workflow/canvas Canvas, Controls and Node components. Existing public controlled props and finite presentation tickets cover this integration; no new host adapter is necessary.

The app owns the authored file map, expanded set, selected path, transient draft, fixed two-node/one-edge graph and inspector target. Only selection changes reach the app graph; dragging, connections, reconnection and deletion are disabled. Code, including script-looking text, is displayed as inert source. ReactFlow renders the fixed app-owned graph. No code/workflow execution, persistence or provider access is added.

Inspectors use the unchanged `createAdminPresentationSession` with one app-declared channel. A held producer deliberately ignores AbortSignal. Context/source reset, selection change and draft change invalidate its ticket before it can commit an outcome. Reset also clears app-owned drafts, expansion and selection. This fences presentation; it does not claim cancellation or rollback of a backend effect.

## Exact candidates and entry ownership

Registry lookup on 2026-10-05 returned E404 for kit-code and kit-workflow. Both are private 0.0.0 source candidates from design-kit commit `dbcf4fa7f5bcfe83686d227b39ddf9426cea4fe5`, prepared by Parallax from a repo-local source copy. Chimera copies identical archives and provenance; runtime source and CSS are unchanged. See `third_party/kit-code-provenance.json`, `kit-workflow-provenance.json` and `checksums.sha256`. Full MIT AND Apache-2.0 terms remain in each archive and in public example license assets. ReactFlow12.10.1 is an exact MIT peer pin.

Root kit-code and root kit-workflow import graphs are audited by actual Vite module parsing with their optional dependencies deliberately not externalized: neither imports ANSI, Shiki or ReactFlow. Workflow canvas is an explicit optional entry. This proof uses plain code display and adds neither ANSI nor a highlighter. Published design-components0.4.0 satisfies the candidates' primitive requirements despite stale source README release guidance.

The developer proof loads through React lazy/Suspense. Flow structural CSS and the exact candidate token bridge stay in its lazy stylesheet. Root Tailwind explicitly scans candidate compiled strings so semantic utility classes, including Node's default `w-sm`, are generated. Browser proof checks actual Node width384px, selected outline1px, token-backed background and canvas height384px. Scanning class strings does not move Flow structural CSS into the core entry.

## Proof and limits

Seven Chromium cases cover real keyboard file/node selection, expansion and stack-frame selection, inert script-looking drafts, fixed graph controls, four delayed inspector retirement paths, narrow layout and full license assets. Authored vertical graph geometry keeps both nodes visible on narrow initial load; local actions make no external requests or mutation requests. The unchanged session's latest-channel/disposal tests remain part of the unit gate. This is a controlled review consumer, not an assertion that every upstream graph control or developer renderer has been integrated. No shared source, Folio or Tachyon adoption is included.
