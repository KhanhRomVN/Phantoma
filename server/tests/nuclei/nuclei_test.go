package nuclei

import (
	"os"
	"testing"

	"github.com/phantoma/server/internal/service/nuclei"
)

func TestNewService(t *testing.T) {
	svc := nuclei.NewService("test-container")
	if svc == nil {
		t.Error("NewService returned nil")
	}
}

func TestService_Scan_EmptyTarget(t *testing.T) {
	_ = nuclei.NewService("nuclei")
	// Note: nuclei.Scan signature is (ctx, target string, tags []string) not ScanRequest
	// This test will be updated when Scanner interface is implemented
	t.Skip("Nuclei Scan signature differs from Scanner interface - update needed")
}

// Integration test - requires running Docker container
func TestService_Scan_Integration(t *testing.T) {
	if os.Getenv("INTEGRATION_TEST") == "" {
		t.Skip("Skipping integration test. Set INTEGRATION_TEST=1 to run")
	}
	t.Skip("Nuclei integration test not yet implemented - Scanner interface not satisfied")
}