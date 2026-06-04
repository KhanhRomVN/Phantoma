package integration_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/phantoma/server/internal/config"
	"github.com/phantoma/server/internal/handler"
)

func TestHealthEndpoint(t *testing.T) {
	cfg, _ := config.Load()
	srv := httptest.NewServer(handler.NewRouter(cfg))
	defer srv.Close()

	resp, err := http.Get(srv.URL + "/health")
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected 200, got %d", resp.StatusCode)
	}

	var body map[string]any
	json.NewDecoder(resp.Body).Decode(&body)

	if body["success"] != true {
		t.Errorf("expected success=true, got %v", body["success"])
	}
}
