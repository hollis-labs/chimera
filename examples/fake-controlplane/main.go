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
	"strings"
	"sync/atomic"
	"syscall"

	"github.com/hollis-labs/chimera/host"
)

//go:embed all:dist
var embedded embed.FS

func demoPlugins(failed bool) (*plugins.Delivery, error) {
	bytes := []byte(`import {createElement,useState} from "react";import {Button} from "@chimera/ui";
 export function Summary(){const [count,setCount]=useState(0);return createElement(Button,{className:"p-7 bg-surface-raised text-fg",onClick:()=>setCount(count+1)},"Fixture provider: unavailable; local count "+count)}
 export function Detail(props){const [count,setCount]=useState(0);return createElement("section",null,createElement("p",null,"Owner: application; no live provider connected"),createElement("p",null,"Detail context: "+props.contextLabel),createElement(Button,{onClick:()=>setCount(count+1)},"Detail state "+count))}
 export function Stable(){const [count,setCount]=useState(0);return createElement(Button,{onClick:()=>setCount(count+1)},"Stable local count "+count)}
 export function Modal(props){return createElement("p",null,"Local fixture modal: "+props.contextLabel)}
 export function Broken(){throw new Error("Fixture render failure")}`)
	r := registry.NewResponse("isolated-fake", 1)
	for _, owner := range []string{"fake-ops", "fixture-tools", "stable-plugin"} {
		r.Plugins[owner] = registry.Plugin{OwnerGeneration: "g1", BundleURL: "/plugins/" + owner + "/g1/bundle.js", BundleVersion: registry.BundleDigest(bytes), Runtime: []registry.Runtime{{Name: "react", Min: "19.3.0", Max: "19.3.0"}}}
	}
	failedBytes := []byte(`throw new Error("Fixture import failure");export function Missing(){return null}`)
	if failed {
		r.Revision = 2
		r.Plugins["failed-import"] = registry.Plugin{OwnerGeneration: "g1", BundleURL: "/plugins/failed-import/g1/bundle.js", BundleVersion: registry.BundleDigest(failedBytes)}
	}
	p := r.Plugins["fake-ops"]
	p.StylesheetURL = "/plugins/fake-ops/g1/style.css"
	r.Plugins["fake-ops"] = p
	type definition struct {
		kind, representation string
		regions              []string
	}
	for _, d := range []definition{{"widget", "component", []string{"operations.summary", "operations.modal"}}, {"panel", "component", []string{"operations.detail"}}, {"page", "component", []string{"operations.page"}}, {"slot", "declarative", []string{"operations.toolbar"}}, {"nav.item", "declarative", []string{"operations.nav"}}, {"command", "handler", []string{"operations.commands"}}} {
		rep := registry.Representation(d.representation)
		r.Kinds[d.kind] = registry.KindDescriptor{SchemaVersion: 1, MetadataSchema: json.RawMessage(`{}`), Representations: []registry.Representation{rep}, Regions: d.regions, RequiredCapabilities: []string{}}
		for _, region := range d.regions {
			ordering := "manifest"
			if region == "operations.summary" {
				ordering = "priority-ascending"
			}
			r.Regions[region] = registry.RegionDescriptor{Kinds: []string{d.kind}, Representations: []registry.Representation{rep}, ContextSchema: json.RawMessage(`{}`), Ordering: ordering}
		}
	}
	declarations := []struct {
		owner, kind, region, key, export, label string
		priority                                int
	}{
		{"fake-ops", "widget", "operations.summary", "summary", "Summary", "Fixture summary", 10},
		{"stable-plugin", "widget", "operations.summary", "stable", "Stable", "Stable fixture", 20},
		{"failed-import", "widget", "operations.summary", "missing", "Missing", "Failed import fixture", 40},
		{"fake-ops", "widget", "operations.summary", "broken", "Broken", "Broken fixture", 30},
		{"fake-ops", "panel", "operations.detail", "detail", "Detail", "Fixture detail", 10},
		{"fake-ops", "page", "operations.page", "page", "Detail", "Fixture page", 10},
		{"fixture-tools", "widget", "operations.modal", "modal", "Modal", "Fixture modal", 10},
		{"fake-ops", "nav.item", "operations.nav", "navigate-detail", "", "Plugin details", 10},
		{"fake-ops", "slot", "operations.toolbar", "open-modal", "", "Open fixture modal", 10},
		{"fake-ops", "slot", "operations.toolbar", "simulate", "", "Fixture simulation", 10},
		{"fake-ops", "slot", "operations.toolbar", "delayed", "", "Delayed fixture simulation", 10},
		{"fixture-tools", "command", "operations.commands", "run", "", "Fixture-only simulation target", 10},
		{"fake-ops", "widget", "operations.summary", "host-overview", "Summary", "Untrusted reserved label", 10},
		{"fake-ops", "future.widget", "operations.summary", "unsupported", "", "Untrusted future label", 10},
	}
	for index, d := range declarations {
		if d.owner == "failed-import" && !failed {
			continue
		}
		meta, _ := json.Marshal(map[string]any{"label": d.label, "priority": d.priority, "manifest_order": index})
		contribution := registry.Contribution{Status: registry.StatusAccepted, OwnerID: d.owner, OwnerGeneration: "g1", LocalKey: d.key, Kind: d.kind, SchemaVersion: 1, Metadata: meta}
		switch {
		case d.export != "":
			contribution.Representation = registry.Component
			contribution.Component = &registry.ComponentRef{Export: d.export, Region: d.region}
		case d.kind == "command":
			contribution.Representation = registry.Handler
			contribution.Handler = &registry.HandlerRef{ID: "fixture-simulation"}
		default:
			contribution.Representation = registry.Declarative
			contribution.Declarative = json.RawMessage(`{}`)
		}
		if err := r.Set(contribution); err != nil {
			return nil, err
		}
	}
	bundles := map[string]plugins.Bundle{}
	for owner := range r.Plugins {
		bundles[owner] = plugins.Bundle{JavaScript: bytes}
	}
	if failed {
		bundles["failed-import"] = plugins.Bundle{JavaScript: failedBytes}
	}
	bundle := bundles["fake-ops"]
	bundle.Stylesheet = []byte(`.fixture-ops{font-weight:var(--font-weight-semibold)}`)
	bundles["fake-ops"] = bundle
	return plugins.NewDelivery(r, bundles, map[string]string{"react": "19.3.0"})
}

func main() {
	addr := flag.String("addr", "127.0.0.1:0", "isolated listen address")
	flag.Parse()
	routes := http.NewServeMux()
	var frameEgress atomic.Int64
	routes.HandleFunc("/api/blocked-frame/", func(w http.ResponseWriter, r *http.Request) { frameEgress.Add(1); w.WriteHeader(http.StatusNoContent) })
	routes.HandleFunc("GET /api/frame-egress", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]int64{"received": frameEgress.Load()})
	})
	routes.HandleFunc("GET /api/providers", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode([]map[string]string{{"id": "fake-agent-fabric", "status": "unavailable", "ownership": "application"}})
	})
	delivery, err := demoPlugins(false)
	if err != nil {
		log.Fatal(err)
	}
	template, err := embedded.ReadFile("dist/frame-document.json")
	if err == nil {
		admit, err := reviewedFrameAdmission(template)
		if err != nil {
			log.Fatal(err)
		}
		documents, err := host.NewFrameDocuments(host.FrameDocumentsConfig{Admit: admit})
		if err != nil {
			log.Fatal(err)
		}
		routes.Handle("/api/frame-documents/", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Method == http.MethodPost || r.Method == http.MethodDelete {
				origin := r.Header.Get("Origin")
				if origin != "http://127.0.0.1:18543" && origin != "http://127.0.0.1:18544" {
					http.Error(w, "fixture origin denied", http.StatusForbidden)
					return
				}
			}
			http.StripPrefix("/api/frame-documents", documents).ServeHTTP(w, r)
		}))
	}
	failure, err := demoPlugins(true)
	if err != nil {
		log.Fatal(err)
	}
	routes.HandleFunc("GET /api/fixture-import-registry", func(w http.ResponseWriter, r *http.Request) {
		request := r.Clone(r.Context())
		request.URL.Path = "/plugins/registry"
		failure.ServeHTTP(w, request)
	})
	frameDeliveries := map[string]*plugins.Delivery{}
	for _, generation := range []string{"g1", "g2", "g3"} {
		frameDelivery, err := demoFramePlugins(generation)
		if err != nil {
			log.Fatal(err)
		}
		frameDeliveries[generation] = frameDelivery
	}
	routes.HandleFunc("GET /api/frame-registry", func(w http.ResponseWriter, r *http.Request) {
		generation := r.URL.Query().Get("generation")
		if generation == "" {
			generation = "g1"
		}
		delivery := frameDeliveries[generation]
		if delivery == nil {
			http.Error(w, "unreviewed fixture generation", 400)
			return
		}
		request := r.Clone(r.Context())
		request.URL.Path = "/plugins/registry"
		delivery.ServeHTTP(w, request)
	})
	pluginHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		parts := strings.Split(r.URL.Path, "/")
		if len(parts) == 5 && strings.HasPrefix(parts[2], "frame-") && frameDeliveries[parts[3]] != nil {
			frameDeliveries[parts[3]].ServeHTTP(w, r)
			return
		}
		if r.URL.Path == "/plugins/failed-import/g1/bundle.js" {
			failure.ServeHTTP(w, r)
		} else {
			delivery.ServeHTTP(w, r)
		}
	})
	assets, err := fs.Sub(embedded, "dist")
	if err != nil {
		log.Fatal(err)
	}
	h, err := host.New(host.Config{Name: "fake-controlplane", Routes: routes, Assets: assets, Plugins: pluginHandler})
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
