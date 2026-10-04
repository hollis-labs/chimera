# Chimera

Reusable Go HTTP/embedded GUI host. Application effects, discovery policy, credentials and provider integrations belong to consumers. Shared subprocess and registry contracts belong to plugin-sdk/plugin-host; use their public DTOs.

Read README.md and docs/boundaries.md before changing lifecycle or frontend authority. Keep exact child environments, reviewed bundle bytes, owner generation fencing and HTTP-first bounded shutdown. No replace directives or committed go.work. Unpublished frontend candidates must be explicitly identified with provenance; never assume release parity.

Use GOWORK=off go vet ./... and go test -race ./.... Frontend: npm ci, npm run typecheck, npm test, npm run build. Local artifacts/cache/temp files belong in ignored .scratch; never build managed source repositories. No publication or deployment is implicit.
