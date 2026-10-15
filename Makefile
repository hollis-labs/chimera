# Build contract for Cerberus (make_standard). Artifacts stay in ignored .scratch.
.PHONY: build
build:
	GOWORK=off go build -o .scratch/chimera ./cmd/chimera
