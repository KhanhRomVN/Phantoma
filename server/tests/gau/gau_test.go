package gau

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/phantoma/server/internal/domain"
	"github.com/phantoma/server/internal/service/gau"
)

// writeLog writes scan output to a log file in the logs directory within the current test folder
func writeLog(target string, content string) error {
	// Get current working directory (should be tests/gau)
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
	svc := gau.NewService("test-container")
	if svc == nil {
		t.Error("NewService returned nil")
	}
}

func TestService_FetchURLs_EmptyDomain(t *testing.T) {
	svc := gau.NewService("gau")
	_, err := svc.FetchURLs(context.Background(), domain.GAURequest{Domain: ""})
	if err == nil {
		t.Error("Expected error for empty domain, got nil")
	}
}

// Integration test - requires running Docker container
func TestService_FetchURLs_Integration(t *testing.T) {
	if os.Getenv("INTEGRATION_TEST") == "" {
		t.Skip("Skipping integration test. Set INTEGRATION_TEST=1 to run")
	}

	targetDomain := "example.com"
	svc := gau.NewService("gau")
	
	req := domain.GAURequest{
		Domain: targetDomain,
		Subs:   true,
	}
	
	result, err := svc.FetchURLs(context.Background(), req)
	if err != nil {
		t.Fatalf("FetchURLs failed: %v", err)
	}
	
	if result.Domain != targetDomain {
		t.Errorf("Expected domain %s, got %s", targetDomain, result.Domain)
	}
	
	// Write output to log file
	if err := writeLog(targetDomain, result.RawOutput); err != nil {
		t.Logf("Warning: failed to write log file: %v", err)
	} else {
		t.Logf("Log saved to logs/%s_*.log", targetDomain)
	}
	
	t.Logf("Found %d URLs for %s", result.Total, targetDomain)
	if len(result.URLs) > 0 {
		t.Logf("First URL: %s", result.URLs[0])
	}
}