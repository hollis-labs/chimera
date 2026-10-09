package main

import (
	"encoding/json"
	"github.com/hollis-labs/chimera/host"
	"github.com/hollis-labs/libs/plugin-mcp/plugin-sdk/registry"
	"net/http"
	"net/http/httptest"
	"strings"
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

func TestReviewedFrameTemplateRequiresCanonicalNonceAndParentOrigin(t *testing.T) {
	template := []byte(`{"html":"<script id=\"plugin-frame-config\" type=\"application/json\">{\"bridge_version\":1,\"frame_id\":\"__FRAME_ID__\",\"nonce\":\"__BRIDGE_NONCE__\",\"parent_origin\":\"__PARENT_ORIGIN__\"}</script><script nonce=\"__DOCUMENT_NONCE__\">reviewed-bootstrap</script>","csp":"script-src 'nonce-__DOCUMENT_NONCE__'","permissionsPolicy":"camera=()"}`)
	admit, err := reviewedFrameAdmission(template)
	if err != nil {
		t.Fatal(err)
	}
	nonce := "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="
	document := host.FrameDocument{FrameID: strings.Repeat("a", 64), CSP: "script-src 'nonce-" + nonce + "'", PermissionsPolicy: "camera=()", HTML: `<script id="plugin-frame-config" type="application/json">{"bridge_version":1,"frame_id":"` + strings.Repeat("a", 64) + `","nonce":"` + strings.Repeat("b", 64) + `","parent_origin":"http://127.0.0.1:18543"}</script><script nonce="` + nonce + `">reviewed-bootstrap</script>`}
	request := httptest.NewRequest("POST", "/", nil)
	request.Header.Set("Origin", "http://127.0.0.1:18543")
	if !admit(request, document) {
		t.Fatal("exact template refused")
	}
	request.Header.Set("Origin", "https://unreviewed.invalid")
	if admit(request, document) {
		t.Fatal("foreign origin accepted")
	}
	request.Header.Set("Origin", "http://127.0.0.1:18543")
	bad := document
	bad.HTML = strings.ReplaceAll(bad.HTML, "reviewed-bootstrap", "unreviewed-bootstrap")
	if admit(request, bad) {
		t.Fatal("unreviewed bootstrap accepted")
	}
	bad = document
	bad.CSP = "default-src *"
	if admit(request, bad) {
		t.Fatal("relaxed policy accepted")
	}
	bad = document
	bad.HTML = strings.ReplaceAll(bad.HTML, nonce, "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB=")
	bad.CSP = strings.ReplaceAll(bad.CSP, nonce, "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB=")
	if admit(request, bad) {
		t.Fatal("noncanonical nonce accepted")
	}
}
