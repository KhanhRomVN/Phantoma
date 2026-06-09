package subfinder

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/phantoma/server/internal/domain"
	"github.com/phantoma/server/internal/service/subfinder"
)

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

func TestNewService(t *testing.T) {
	svc := subfinder.NewService("test-container")
	if svc == nil {
		t.Error("NewService returned nil")
	}
}

func TestService_Scan_EmptyTarget(t *testing.T) {
	svc := subfinder.NewService("subfinder")
	_, err := svc.Scan(context.Background(), domain.ScanRequest{Target: ""})
	if err == nil {
		t.Error("Expected error for empty target, got nil")
	}
}

func TestFormatOutput(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "single subdomain",
			input:    "www.example.com\n",
			expected: "www.example.com",
		},
		{
			name:     "multiple subdomains",
			input:    "www.example.com\nmail.example.com\napi.example.com\n",
			expected: "www.example.com\nmail.example.com\napi.example.com",
		},
		{
			name:     "empty input",
			input:    "",
			expected: "",
		},
		{
			name:     "with empty lines",
			input:    "www.example.com\n\nmail.example.com\n",
			expected: "www.example.com\nmail.example.com",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// formatOutput is unexported, test indirectly via service
			// For now, skip unit test
			t.Skip("formatOutput is unexported, test via integration")
		})
	}
}

// Integration test - requires running Docker container
func TestService_Scan_Integration(t *testing.T) {
	if os.Getenv("INTEGRATION_TEST") == "" {
		t.Skip("Skipping integration test. Set INTEGRATION_TEST=1 to run")
	}

	target := "deepseek.com"
	svc := subfinder.NewService("subfinder")
	result, err := svc.Scan(context.Background(), domain.ScanRequest{
		Target: target,
		Flags:  []string{"-silent"}, // Silent mode for cleaner output
	})
	if err != nil {
		t.Fatalf("Scan failed: %v", err)
	}
	if !result.Success {
		t.Errorf("Scan not successful: %s", result.Error)
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

	t.Logf("Output:\n%s", result.Output)
}