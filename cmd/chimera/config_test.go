package main

import (
	"strings"
	"testing"
)

func TestPluginConfigCarriesInventorySettingsAndHostIngest(t *testing.T) {
	got, err := pluginConfig("activity-monitor", map[string]string{"tether_url": "https://hub.example", "machine": "agent-os"}, "http://127.0.0.1:8099/api/ingest/activity-monitor", "tok")
	if err != nil {
		t.Fatal(err)
	}
	want := map[string]string{"tether_url": "https://hub.example", "machine": "agent-os", "ingest_url": "http://127.0.0.1:8099/api/ingest/activity-monitor", "ingest_token": "tok"}
	if len(got) != len(want) {
		t.Fatalf("config = %v, want %v", got, want)
	}
	for k, v := range want {
		if got[k] != v {
			t.Errorf("config[%q] = %q, want %q", k, got[k], v)
		}
	}
}

func TestPluginConfigWithoutSettingsIsTheOldBehavior(t *testing.T) {
	got, err := pluginConfig("p", nil, "u", "t")
	if err != nil || len(got) != 2 || got["ingest_url"] != "u" || got["ingest_token"] != "t" {
		t.Fatalf("config = %v, %v", got, err)
	}
}

func TestPluginConfigRefusesHostKeys(t *testing.T) {
	for _, key := range []string{"ingest_url", "ingest_token"} {
		_, err := pluginConfig("p", map[string]string{key: "x"}, "u", "t")
		if err == nil || !strings.Contains(err.Error(), key) {
			t.Errorf("config with %s: err = %v, want a refusal naming the key", key, err)
		}
	}
}
