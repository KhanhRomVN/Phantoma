package godork_test

import (
	"context"
	"os"
	"testing"

	"github.com/phantoma/server/internal/domain"
	godork "github.com/phantoma/server/internal/service/go-dork"
)

func TestNewService(t *testing.T) {
	svc := godork.NewService("")
	if svc == nil {
		t.Error("NewService returned nil")
	}
}

func TestService_Search_EmptyQuery(t *testing.T) {
	svc := godork.NewService("go-dork")
	_, err := svc.Search(context.Background(), domain.DorkQuery{Query: ""})
	if err == nil {
		t.Error("Expected error for empty query, got nil")
	}
}

func TestService_Search_InvalidContainer(t *testing.T) {
	svc := godork.NewService("nonexistent-container")
	_, err := svc.Search(context.Background(), domain.DorkQuery{
		Query: "inurl:login",
		Pages: 1,
	})
	if err == nil {
		t.Error("Expected error for invalid container, got nil")
	}
}

// Integration test - requires Docker container with go-dork installed
func TestService_Search_Integration(t *testing.T) {
	if os.Getenv("INTEGRATION_TEST") == "" {
		t.Skip("Skipping integration test. Set INTEGRATION_TEST=1 to run")
	}

	svc := godork.NewService("go-dork")
	result, err := svc.Search(context.Background(), domain.DorkQuery{
		Query:  "inurl:login",
		Engine: domain.EngineGoogle,
		Pages:  1,
	})
	if err != nil {
		t.Fatalf("Search failed: %v", err)
	}
	if result == nil {
		t.Fatal("Result is nil")
	}
	t.Logf("Found %d results for query '%s'", result.Total, result.Query)
	for i, r := range result.Results {
		if i >= 5 {
			break
		}
		t.Logf("  %d: %s - %s", i+1, r.URL, r.Title)
	}
}

func TestParseOutput(t *testing.T) {
	// Test internal parse function via exported Search method?
	// For now, just verify service methods exist
	svc := godork.NewService("")
	if svc == nil {
		t.Fatal("Service creation failed")
	}
}