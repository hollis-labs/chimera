package main

import (
	"encoding/json"
	"github.com/hollis-labs/chimera/host"
	"github.com/hollis-labs/plugin-sdk/registry"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestApplicationPolicyStaysOutsideHost(t *testing.T) {
	app := http.NewServeMux()
	app.HandleFunc("GET /api/providers", func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusServiceUnavailable) })
	h, err := host.New(host.Config{Name: "fake", Routes: app})
	if err != nil {
		t.Fatal(err)
	}
	for _, entry := range []struct {
		method, path string
		code         int
	}{{"GET", "/api/providers", 503}, {"POST", "/api/providers", 405}, {"GET", "/healthz", 200}} {
		w := httptest.NewRecorder()
		h.Handler().ServeHTTP(w, httptest.NewRequest(entry.method, entry.path, nil))
		if w.Code != entry.code {
			t.Fatalf("%s: %d", entry.path, w.Code)
		}
	}
}

func TestReviewedRoutingFixtures(t *testing.T) {
	for _, failed := range []bool{false, true} {
		delivery, err := demoPlugins(failed)
		if err != nil {
			t.Fatal(err)
		}
		w := httptest.NewRecorder()
		delivery.ServeHTTP(w, httptest.NewRequest("GET", "/plugins/registry", nil))
		var response registry.Response
		if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
			t.Fatal(err)
		}
		if err := response.Validate(); err != nil {
			t.Fatal(err)
		}
		_, exists := response.Plugins["failed-import"]
		if exists != failed {
			t.Fatal("import failure must be a separate optional transaction")
		}
		for owner, plugin := range response.Plugins {
			bundle := httptest.NewRecorder()
			delivery.ServeHTTP(bundle, httptest.NewRequest("GET", plugin.BundleURL, nil))
			if bundle.Code != 200 || registry.BundleDigest(bundle.Body.Bytes()) != plugin.BundleVersion {
				t.Fatalf("owner %s announced unverified bytes", owner)
			}
		}
	}
}
