package main

import (
	"bufio"
	"bytes"
	"context"
	"crypto/rand"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	streamhub "github.com/hollis-labs/go-streamhub"
)

const (
	eventStream    = "events"
	maxIngestBytes = 1 << 20
	keepalive      = 15 * time.Second
)

// bus accepts pushed event lines from plugins (and later remote collectors)
// and fans them out to SSE subscribers with cursor replay.
type bus struct {
	hub    *streamhub.Hub
	tokens map[string]string // plugin id -> bearer token
}

func newBus(pluginIDs []string) (*bus, error) {
	b := &bus{hub: streamhub.New(streamhub.NewMemoryLog(
		streamhub.WithMemoryRetention(streamhub.Retention{MaxRecords: 10000})), streamhub.WithAutoOpen(true)),
		tokens: map[string]string{}}
	for _, id := range pluginIDs {
		raw := make([]byte, 32)
		if _, err := rand.Read(raw); err != nil {
			return nil, err
		}
		b.tokens[id] = hex.EncodeToString(raw)
	}
	return b, nil
}

func (b *bus) routes(plugins http.Handler) http.Handler {
	mux := http.NewServeMux()
	mux.Handle("/api/plugins/", plugins)
	mux.HandleFunc("POST /api/ingest/{id}", b.ingest)
	mux.HandleFunc("GET /api/stream", b.stream)
	return mux
}

// ingest takes NDJSON: one JSON object per line, each carrying string
// "kind" and "session_id" (the go-runtime-events envelope). Payloads stay
// opaque. The whole request is rejected if any line is malformed.
func (b *bus) ingest(w http.ResponseWriter, r *http.Request) {
	want, ok := b.tokens[r.PathValue("id")]
	got, found := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer ")
	if !ok || !found || subtle.ConstantTimeCompare([]byte(got), []byte(want)) != 1 {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	body, err := io.ReadAll(io.LimitReader(r.Body, maxIngestBytes+1))
	if err != nil || len(body) > maxIngestBytes {
		http.Error(w, "bad or oversized body", http.StatusRequestEntityTooLarge)
		return
	}
	type kinded struct {
		Kind      string `json:"kind"`
		SessionID string `json:"session_id"`
	}
	var lines [][]byte
	var kinds []string
	sc := bufio.NewScanner(bytes.NewReader(body))
	sc.Buffer(make([]byte, 64<<10), maxIngestBytes)
	for sc.Scan() {
		line := bytes.TrimSpace(sc.Bytes())
		if len(line) == 0 {
			continue
		}
		var k kinded
		if json.Unmarshal(line, &k) != nil || k.Kind == "" || k.SessionID == "" {
			http.Error(w, "each line must be a JSON object with kind and session_id", http.StatusBadRequest)
			return
		}
		lines = append(lines, append([]byte(nil), line...))
		kinds = append(kinds, k.Kind)
	}
	var latest streamhub.Seq
	for i, line := range lines {
		rec, err := b.hub.Publish(r.Context(), eventStream, streamhub.Event{Name: kinds[i], Data: line})
		if err != nil {
			http.Error(w, "publish failed", http.StatusInternalServerError)
			return
		}
		latest = rec.Seq
	}
	w.Header().Set("Content-Type", "application/json")
	fmt.Fprintf(w, `{"accepted":%d,"latest":%d}`, len(lines), latest)
}

// stream is Server-Sent Events. Resume with ?since=<seq> or Last-Event-ID;
// without either, only live events are sent. ?kind= filters by kind prefix.
func (b *bus) stream(w http.ResponseWriter, r *http.Request) {
	fl, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming unsupported", http.StatusInternalServerError)
		return
	}
	after := streamhub.FromLatest
	if s := firstNonEmpty(r.URL.Query().Get("since"), r.Header.Get("Last-Event-ID")); s != "" {
		n, err := strconv.ParseUint(s, 10, 64)
		if err != nil {
			http.Error(w, "bad cursor", http.StatusBadRequest)
			return
		}
		after = streamhub.Seq(n)
	}
	prefix := r.URL.Query().Get("kind")
	opts := streamhub.SubscribeOptions{After: after}
	if prefix != "" {
		opts.Filter = func(rec streamhub.Record) bool { return strings.HasPrefix(rec.Name, prefix) }
	}
	sub, err := b.hub.Subscribe(r.Context(), eventStream, opts)
	if err != nil {
		http.Error(w, "subscribe failed", http.StatusInternalServerError)
		return
	}
	defer sub.Close()
	h := w.Header()
	h.Set("Content-Type", "text/event-stream")
	h.Set("Cache-Control", "no-cache")
	h.Set("X-Accel-Buffering", "no")
	fmt.Fprint(w, ": connected\n\n")
	fl.Flush()
	for {
		ctx, cancel := context.WithTimeout(r.Context(), keepalive)
		item, err := sub.Next(ctx)
		cancel()
		switch {
		case err == nil:
		case errors.Is(err, context.DeadlineExceeded) && r.Context().Err() == nil:
			fmt.Fprint(w, ": keepalive\n\n")
			fl.Flush()
			continue
		default:
			return
		}
		if item.Gap != nil {
			fmt.Fprint(w, "event: gap\ndata: {}\n\n")
		} else {
			fmt.Fprintf(w, "id: %d\nevent: %s\ndata: %s\n\n", item.Record.Seq, item.Record.Name, item.Record.Data)
		}
		fl.Flush()
	}
}

func firstNonEmpty(ss ...string) string {
	for _, s := range ss {
		if s != "" {
			return s
		}
	}
	return ""
}
