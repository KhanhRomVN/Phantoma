package rustscan

import (
	"context"
	"os"
	"testing"

	"github.com/phantoma/server/internal/service/rustscan"
)

func TestNewService(t *testing.T) {
	svc := rustscan.NewService("test-container")
	if svc == nil {
		t.Error("NewService returned nil")
	}
}

func TestService_Scan_EmptyTarget(t *testing.T) {
	svc := rustscan.NewService("rustscan")
	_, _, err := svc.Scan(context.Background(), "", "")
	if err == nil {
		t.Error("Expected error for empty target, got nil")
	}
}

// Integration test - requires running Docker container
func TestService_Scan_Integration(t *testing.T) {
	if os.Getenv("INTEGRATION_TEST") == "" {
		t.Skip("Skipping integration test. Set INTEGRATION_TEST=1 to run")
	}

	// RustScan fast port scan
	svc := rustscan.NewService("rustscan")
	ports, raw, err := svc.Scan(context.Background(), "scanme.nmap.org", "1-1000")
	if err != nil {
		t.Fatalf("Scan failed: %v", err)
	}
	if len(ports) == 0 {
		t.Log("No open ports found, but scan completed")
	}
	t.Logf("Found %d open ports", len(ports))
	t.Logf("Output: %s", raw)
}
