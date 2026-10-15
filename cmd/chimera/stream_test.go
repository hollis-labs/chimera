package main

import (
	"bufio"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func testBus(t *testing.T) (*bus, *httptest.Server) {
	t.Helper()
	b, err := newBus([]string{"mon"})
	if err != nil {
		t.Fatal(err)
	}
	srv := httptest.NewServer(b.routes(http.NotFoundHandler()))
	t.Cleanup(srv.Close)
	return b, srv
}

func post(t *testing.T, srv *httptest.Server, id, token, body string) *http.Response {
	t.Helper()
	req, _ := http.NewRequest("POST", srv.URL+"/api/ingest/"+id, strings.NewReader(body))
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { resp.Body.Close() })
	return resp
}

func TestIngestAuthAndValidation(t *testing.T) {
	b, srv := testBus(t)
	good := `{"kind":"session.idle","session_id":"s1"}` + "\n"
	for name, c := range map[string]struct {
		id, token, body string
		want            int
	}{
		"no token":       {"mon", "", good, 401},
		"wrong token":    {"mon", "nope", good, 401},
		"unknown plugin": {"zzz", b.tokens["mon"], good, 401},
		"missing kind":   {"mon", b.tokens["mon"], `{"session_id":"s1"}`, 400},
		"not json":       {"mon", b.tokens["mon"], "oops", 400},
		"one bad line":   {"mon", b.tokens["mon"], good + "oops\n", 400},
		"ok":             {"mon", b.tokens["mon"], good + good, 200},
	} {
		if got := post(t, srv, c.id, c.token, c.body).StatusCode; got != c.want {
			t.Errorf("%s: status %d, want %d", name, got, c.want)
		}
	}
	// Rejected requests must not have published anything: only the "ok" pair exists.
	head, _ := b.hub.Head(t.Context(), eventStream)
	if head.Latest != 2 {
		t.Errorf("published %d, want 2", head.Latest)
	}
}

func TestStreamReplaysThenDeliversLive(t *testing.T) {
	b, srv := testBus(t)
	post(t, srv, "mon", b.tokens["mon"], `{"kind":"process.started","session_id":"a"}`)

	resp, err := http.Get(srv.URL + "/api/stream?since=0")
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	frames := make(chan string, 8)
	go func() {
		sc := bufio.NewScanner(resp.Body)
		for sc.Scan() {
			if strings.HasPrefix(sc.Text(), "event: ") {
				frames <- strings.TrimPrefix(sc.Text(), "event: ")
			}
		}
	}()
	expect := func(want string) {
		t.Helper()
		select {
		case got := <-frames:
			if got != want {
				t.Fatalf("event %q, want %q", got, want)
			}
		case <-time.After(3 * time.Second):
			t.Fatalf("timed out waiting for %q", want)
		}
	}
	expect("process.started") // replayed
	post(t, srv, "mon", b.tokens["mon"], `{"kind":"process.exited","session_id":"a"}`)
	expect("process.exited") // live, no polling
}
