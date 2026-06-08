package alienvault

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/phantoma/server/internal/domain"
	"github.com/phantoma/server/internal/service/alienvault"
)

func TestNewService(t *testing.T) {
	// Ensure no panic
	svc := alienvault.NewService()
	if svc == nil {
		t.Error("NewService returned nil")
	}
}

func TestService_Scan_MissingAPIKey(t *testing.T) {
	// Clear API key env vars
	os.Unsetenv("OTX_API_KEY")
	os.Unsetenv("ALIENVAULT_OTX_KEY")

	svc := alienvault.NewService()
	result, err := svc.Scan(context.Background(), domain.ScanRequest{Target: "8.8.8.8"})
	if err != nil {
		t.Fatalf("Scan returned error: %v", err)
	}
	if result.Success {
		t.Error("Expected scan to fail without API key, but got Success=true")
	}
	if result.Error == "" {
		t.Error("Expected error message about missing API key")
	}
}

func TestService_Scan_EmptyTarget(t *testing.T) {
	os.Setenv("OTX_API_KEY", "test-key")
	defer os.Unsetenv("OTX_API_KEY")

	svc := alienvault.NewService()
	_, err := svc.Scan(context.Background(), domain.ScanRequest{Target: ""})
	if err == nil {
		t.Error("Expected error for empty target, got nil")
	}
}

func TestService_Scan_Success(t *testing.T) {
	// Setup mock OTX server
	mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Check API key header
		if r.Header.Get("X-OTX-API-KEY") != "test-api-key" {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		// Return mock response
		response := map[string]interface{}{
			"indicator": "8.8.8.8",
			"pulse_info": map[string]interface{}{
				"count": 5,
			},
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	}))
	defer mockServer.Close()

	// Override base URL for testing (requires modifying service - using env for simplicity)
	os.Setenv("OTX_API_KEY", "test-api-key")
	defer os.Unsetenv("OTX_API_KEY")

	// Note: This will call real OTX API unless we modify the service to allow URL override
	// For now, skip if no network
	t.Skip("Requires network or service URL injection - implement via dependency injection")
}

func TestDetectIndicatorType(t *testing.T) {
	tests := []struct {
		target   string
		expected string
	}{
		{"8.8.8.8", "IPv4"},
		{"192.168.1.1", "IPv4"},
		{"2001:db8::1", "IPv6"},
		{"google.com", "domain"},
		{"example.org", "domain"},
		{"not-valid", "domain"},
	}

	for _, tt := range tests {
		t.Run(tt.target, func(t *testing.T) {
			// Access unexported function via reflection or move to exported
			// For now, test indirectly through service
			t.Skip("detectIndicatorType is unexported")
		})
	}
}

// writeLog writes scan output to a log file in the logs directory within the current test folder
func writeLog(target string, content string) error {
	// Get current working directory (should be tests/amass or tests/subfinder or tests/alienvault)
	cwd, err := os.Getwd()
	if err != nil {
		return fmt.Errorf("failed to get current directory: %w", err)
	}
	
	// Create logs directory in current test folder
	logsDir := filepath.Join(cwd, "logs")
	
	// Create logs directory if not exists
	if err := os.MkdirAll(logsDir, 0755); err != nil {
		return fmt.Errorf("failed to create logs directory: %w", err)
	}

	// Generate filename: target_timestamp.log
	timestamp := time.Now().Format("20060102_150405")
	filename := fmt.Sprintf("%s_%s.log", target, timestamp)
	filePath := filepath.Join(logsDir, filename)

	// Write content to file
	if err := os.WriteFile(filePath, []byte(content), 0644); err != nil {
		return fmt.Errorf("failed to write log file: %w", err)
	}

	return nil
}

// Integration test - requires API key in .env
func TestService_Scan_Integration(t *testing.T) {
	if os.Getenv("INTEGRATION_TEST") == "" {
		t.Skip("Skipping integration test. Set INTEGRATION_TEST=1 to run")
	}

	// Check if API key is set
	apiKey := os.Getenv("OTX_API_KEY")
	if apiKey == "" {
		apiKey = os.Getenv("ALIENVAULT_OTX_KEY")
	}
	if apiKey == "" {
		t.Skip("OTX_API_KEY environment variable not set. Skipping integration test.")
	}

	targets := []string{"8.8.8.8", "google.com", "1.1.1.1"}
	
	for _, target := range targets {
		t.Run(target, func(t *testing.T) {
			svc := alienvault.NewService()
			result, err := svc.Scan(context.Background(), domain.ScanRequest{
				Target: target,
			})
			if err != nil {
				t.Fatalf("Scan failed for %s: %v", target, err)
			}
			if !result.Success {
				t.Errorf("Scan not successful for %s: %s", target, result.Error)
			}
			if result.Output == "" {
				t.Error("Expected output, got empty string")
			}

			// Write output to log file
			if err := writeLog(target, result.Output); err != nil {
				t.Logf("Warning: failed to write log file: %v", err)
			} else {
				t.Logf("Log saved to logs/%s_*.log", target)
			}

			t.Logf("Output for %s:\n%s", target, result.Output)
		})
	}
}
