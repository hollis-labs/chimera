package main

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"github.com/hollis-labs/chimera/host"
	"net/http"
	"regexp"
	"strings"
)

// Only the reviewed offline fixture exposes provisioning. The template is emitted
// by upstream createFrameDocument; this adapter substitutes closed nonce/origin
// tokens, never accepts arbitrary client HTML/CSP or relaxes the parent's policy.
func reviewedFrameAdmission(templateBytes []byte) (func(*http.Request, host.FrameDocument) bool, error) {
	var template struct {
		HTML              string `json:"html"`
		CSP               string `json:"csp"`
		PermissionsPolicy string `json:"permissionsPolicy"`
	}
	if err := json.Unmarshal(templateBytes, &template); err != nil {
		return nil, err
	}
	noncePattern := regexp.MustCompile(`'nonce-([A-Za-z0-9+/]{43}=)'`)
	configPattern := regexp.MustCompile(`<script id="plugin-frame-config" type="application/json">([^<]+)</script>`)
	hexPattern := regexp.MustCompile(`^[a-f0-9]{64}$`)
	return func(r *http.Request, document host.FrameDocument) bool {
		if document.PermissionsPolicy != template.PermissionsPolicy {
			return false
		}
		nonce := noncePattern.FindStringSubmatch(document.CSP)
		config := configPattern.FindStringSubmatch(document.HTML)
		if len(nonce) != 2 || len(config) != 2 {
			return false
		}
		nonceBytes, err := base64.StdEncoding.DecodeString(nonce[1])
		if err != nil || len(nonceBytes) != 32 || base64.StdEncoding.EncodeToString(nonceBytes) != nonce[1] {
			return false
		}
		var binding struct {
			Version      int    `json:"bridge_version"`
			FrameID      string `json:"frame_id"`
			Nonce        string `json:"nonce"`
			ParentOrigin string `json:"parent_origin"`
		}
		decoder := json.NewDecoder(bytes.NewBufferString(config[1]))
		decoder.DisallowUnknownFields()
		if decoder.Decode(&binding) != nil || binding.Version != 1 || binding.FrameID != document.FrameID || !hexPattern.MatchString(binding.Nonce) {
			return false
		}
		if binding.ParentOrigin != "http://127.0.0.1:18543" && binding.ParentOrigin != "http://127.0.0.1:18544" {
			return false
		}
		if r.Header.Get("Origin") != binding.ParentOrigin {
			return false
		}
		replace := strings.NewReplacer("__FRAME_ID__", document.FrameID, "__BRIDGE_NONCE__", binding.Nonce, "__PARENT_ORIGIN__", binding.ParentOrigin, "__DOCUMENT_NONCE__", nonce[1])
		return document.CSP == replace.Replace(template.CSP) && document.HTML == replace.Replace(template.HTML)
	}, nil
}
