// A second isolated consumer. All provider state is fixture data and read-only.
package main

import (
	"context"
	"embed"
	"encoding/json"
	"flag"
	"github.com/hollis-labs/chimera/plugins"
	"github.com/hollis-labs/plugin-sdk/registry"
	"io/fs"
	"log"
	"net"
	"net/http"
	"os/signal"
	"syscall"

	"github.com/hollis-labs/chimera/host"
)

//go:embed all:dist
var embedded embed.FS

func demoPlugins() (*plugins.Delivery, error) {
	bytes := []byte(`import {createElement,useState} from "react";import {Button} from "@chimera/ui";export function Summary(){const [count,setCount]=useState(0);return createElement(Button,{className:"p-7 bg-surface-raised text-fg",onClick:()=>setCount(count+1)},"Fixture provider: unavailable; local count "+count)}export function Detail(){return createElement("p",null,"Owner: application; no live provider connected")}`)
	r := registry.NewResponse("isolated-fake", 1)
	r.Plugins["fake-ops"] = registry.Plugin{OwnerGeneration: "g1", BundleURL: "/plugins/fake-ops/g1/bundle.js", BundleVersion: registry.BundleDigest(bytes), StylesheetURL: "/plugins/fake-ops/g1/style.css", Runtime: []registry.Runtime{{Name: "react", Min: "19.3.0", Max: "19.3.0"}}}
	for _, entry := range []struct{ kind, region, key, export, label string }{{"widget", "operations.summary", "summary", "Summary", "Fixture summary"}, {"panel", "operations.detail", "detail", "Detail", "Fixture detail"}} {
		r.Kinds[entry.kind] = registry.KindDescriptor{SchemaVersion: 1, MetadataSchema: json.RawMessage(`{}`), Representations: []registry.Representation{registry.Component}, Regions: []string{entry.region}, RequiredCapabilities: []string{}}
		r.Regions[entry.region] = registry.RegionDescriptor{Kinds: []string{entry.kind}, Representations: []registry.Representation{registry.Component}, ContextSchema: json.RawMessage(`{}`), Ordering: "manifest"}
		meta, _ := json.Marshal(map[string]string{"label": entry.label})
		if err := r.Set(registry.Contribution{Status: registry.StatusAccepted, OwnerID: "fake-ops", OwnerGeneration: "g1", LocalKey: entry.key, Kind: entry.kind, SchemaVersion: 1, Representation: registry.Component, Metadata: meta, Component: &registry.ComponentRef{Export: entry.export, Region: entry.region}}); err != nil {
			return nil, err
		}
	}
	return plugins.NewDelivery(r, map[string]plugins.Bundle{"fake-ops": {JavaScript: bytes, Stylesheet: []byte(`.fixture-ops{font-weight:var(--font-weight-semibold)}`)}}, map[string]string{"react": "19.3.0"})
}

func main() {
	addr := flag.String("addr", "127.0.0.1:0", "isolated listen address")
	flag.Parse()
	routes := http.NewServeMux()
	routes.HandleFunc("GET /api/providers", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode([]map[string]string{{"id": "fake-agent-fabric", "status": "unavailable", "ownership": "application"}})
	})
	delivery, err := demoPlugins()
	if err != nil {
		log.Fatal(err)
	}
	assets, err := fs.Sub(embedded, "dist")
	if err != nil {
		log.Fatal(err)
	}
	h, err := host.New(host.Config{Name: "fake-controlplane", Routes: routes, Assets: assets, Plugins: delivery})
	if err != nil {
		log.Fatal(err)
	}
	listener, err := net.Listen("tcp", *addr)
	if err != nil {
		log.Fatal(err)
	}
	log.Printf("isolated fake consumer http://%s", listener.Addr())
	ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer cancel()
	if err := h.Serve(ctx, listener); err != nil {
		log.Fatal(err)
	}
}
