// Command chimera is the temporary home for plugins that do not yet have an
// app identity: it starts the plugins named in an inventory file and exposes
// their HTTP routes at /api/plugins/{id}/ behind one same-origin host.
package main

import (
	"context"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"log"
	"net"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"

	"github.com/hollis-labs/chimera/host"
	"github.com/hollis-labs/chimera/plugins"
	pluginhost "github.com/hollis-labs/libs/plugin-mcp/plugin-host"
	"github.com/hollis-labs/libs/plugin-mcp/plugin-sdk/capability"
	"github.com/hollis-labs/libs/plugin-mcp/plugin-sdk/subprocess"
)

type inventoryFile struct {
	Plugins []struct {
		ID      string   `json:"id"`
		Command string   `json:"command"`
		Args    []string `json:"args"`
		Dir     string   `json:"dir"`
		// Env is the plugin's exact environment: nothing is inherited.
		Env []string `json:"env"`
	} `json:"plugins"`
}

func main() {
	addr := flag.String("addr", "127.0.0.1:8099", "listen address (loopback by default: no auth yet)")
	cfgPath := flag.String("config", defaultConfig(), "plugin inventory file (default: <user config dir>/chimera/chimera.json)")
	flag.Parse()
	if err := run(*addr, *cfgPath); err != nil {
		fmt.Fprintln(os.Stderr, "chimera:", err)
		os.Exit(1)
	}
}

// defaultConfig keeps the machine-specific inventory out of the repo and out
// of service definitions: the same unit works wherever the file exists.
func defaultConfig() string {
	if dir, err := os.UserConfigDir(); err == nil {
		return filepath.Join(dir, "chimera", "chimera.json")
	}
	return "chimera.json"
}

func run(addr, cfgPath string) error {
	raw, err := os.ReadFile(cfgPath)
	if err != nil {
		return err
	}
	var inv inventoryFile
	if err := json.Unmarshal(raw, &inv); err != nil {
		return fmt.Errorf("%s: %w", cfgPath, err)
	}
	ids := make([]string, 0, len(inv.Plugins))
	for _, p := range inv.Plugins {
		ids = append(ids, p.ID)
	}
	b, err := newBus(ids)
	if err != nil {
		return err
	}
	ln, err := net.Listen("tcp", addr)
	if err != nil {
		return err
	}
	var specs []pluginhost.Spec
	for _, p := range inv.Plugins {
		init, err := initParams(p.ID, p.Command, p.Dir)
		if err != nil {
			_ = ln.Close()
			return err
		}
		// The plugin pushes events here instead of being polled. The token is
		// per plugin and never logged.
		init.Config = map[string]string{
			"ingest_url":   "http://" + ln.Addr().String() + "/api/ingest/" + p.ID,
			"ingest_token": b.tokens[p.ID],
		}
		specs = append(specs, pluginhost.Spec{ID: p.ID, Command: p.Command, Args: p.Args, Dir: p.Dir, Env: p.Env, Init: init})
	}
	inventory := plugins.NewInventory(specs)
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	if err := inventory.Start(ctx); err != nil {
		_ = ln.Close()
		return err
	}
	h, err := host.New(host.Config{Name: "chimera", Routes: b.routes(inventory.APIRoutes()),
		Stop: func(c context.Context) error { return errors.Join(b.hub.Shutdown(c), inventory.Stop(c)) }})
	if err != nil {
		_ = ln.Close()
		_ = inventory.Stop(context.Background())
		return err
	}
	log.Printf("chimera: %d plugin(s), listening on http://%s", len(specs), ln.Addr())
	return h.Serve(ctx, ln)
}

// initParams builds the plugin/init payload. No capabilities are granted:
// activity-monitor only reads /proc and the agent session files it names.
func initParams(id, command, dir string) (subprocess.InitParams, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return subprocess.InitParams{}, err
	}
	data := filepath.Join(home, ".local", "share", "chimera", id)
	cache := filepath.Join(home, ".cache", "chimera", id)
	for _, d := range []string{data, cache} {
		if err := os.MkdirAll(d, 0o700); err != nil {
			return subprocess.InitParams{}, err
		}
	}
	if dir == "" {
		dir = filepath.Dir(command)
	}
	return subprocess.InitParams{
		HostInfo:           subprocess.HostInfo{Version: "0.1.0", Protocol: subprocess.ProtocolVersion},
		PluginDir:          dir,
		DataDir:            data,
		CacheDir:           cache,
		CapabilityContract: capability.ContractVersion,
		Incarnation:        capability.RuntimeIdentity{HostInstance: "chimera", OwnerID: id, OwnerGeneration: 1},
		Grants:             capability.GrantSet{},
	}, nil
}
