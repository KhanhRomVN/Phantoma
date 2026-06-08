package metasploit

import (
	"context"
	"os"
	"testing"

	"github.com/phantoma/server/internal/domain"
	"github.com/phantoma/server/internal/service/metasploit"
)

func TestNewService(t *testing.T) {
	svc := metasploit.NewService("test-container")
	if svc == nil {
		t.Error("NewService returned nil")
	}
}

func TestService_Scan_EmptyTarget(t *testing.T) {
	svc := metasploit.NewService("metasploit")
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

	svc := metasploit.NewService("metasploit")
	result, err := svc.Scan(context.Background(), domain.ScanRequest{
		Target: "127.0.0.1",
		Flags:  []string{"use auxiliary/scanner/portscan/tcp; set RHOSTS 127.0.0.1; set PORTS 1-100; run; exit"},
	})
	if err != nil {
		t.Fatalf("Scan failed: %v", err)
	}
	if !result.Success {
		t.Errorf("Scan not successful: %s", result.Error)
	}
	t.Logf("Output: %s", result.Output)
}