package main

import (
	"github.com/hollis-labs/chimera/host"
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
