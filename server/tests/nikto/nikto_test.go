package nikto

import (
	"context"
	"os"
	"testing"

	"github.com/phantoma/server/internal/domain"
	"github.com/phantoma/server/internal/service/nikto"
)

func TestNewService(t *testing.T) {
	svc := nikto.NewService("test-container")
	if svc == nil {
		t.Error("NewService returned nil")
	}
}

func TestService_Scan_EmptyTarget(t *testing.T) {
	svc := nikto.NewService("nikto")
	_, err := svc.Scan(context.Background(), domain.ScanRequest{Target: ""})
	if err == nil {
		t.Error("Expected error for empty target, got nil")
	}
}

// Integration test - requires running Docker container
func TestService_Scan_Integration(t *testing.T) {
	if os.Getenv("INTEGRATION_TEST") == "" {
		t.Skip("Skipping integration test. Set INTEGRATION_TEST=1 to run")
	}

	// Nikto scans can be long, implement as needed
	t.Skip("Nikto integration test not yet implemented")
}