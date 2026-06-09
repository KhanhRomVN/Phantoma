package certsh

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"testing"
	"time"

	"github.com/phantoma/server/internal/domain"
	"github.com/phantoma/server/internal/service/certsh"
)

var (
	globalLogFile *os.File
	logMutex      sync.Mutex
)

// TestMain is the entry point for all tests
func TestMain(m *testing.M) {
	// Create logs directory if not exists
	cwd, err := os.Getwd()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to get current directory: %v\n", err)
		os.Exit(1)
	}

	logsDir := filepath.Join(cwd, "logs")
	if err := os.MkdirAll(logsDir, 0755); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to create logs directory: %v\n", err)
		os.Exit(1)
	}

	// Create a single log file with timestamp
	timestamp := time.Now().Format("20060102_150405")
	logFilePath := filepath.Join(logsDir, fmt.Sprintf("test_run_%s.log", timestamp))
	
	globalLogFile, err = os.Create(logFilePath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to create log file: %v\n", err)
		os.Exit(1)
	}
	defer globalLogFile.Close()

	// Write header
	header := fmt.Sprintf("=== Test Run at %s ===\n\n", time.Now().Format("2006-01-02 15:04:05"))
	globalLogFile.WriteString(header)

	// Run tests
	exitCode := m.Run()

	// Write footer
	footer := fmt.Sprintf("\n=== Test Run Finished at %s ===\n", time.Now().Format("2006-01-02 15:04:05"))
	globalLogFile.WriteString(footer)

	os.Exit(exitCode)
}

// appendToLog appends content to the global log file with a section header
func appendToLog(section string, content string) error {
	logMutex.Lock()
	defer logMutex.Unlock()

	if globalLogFile == nil {
		return fmt.Errorf("global log file not initialized")
	}

	header := fmt.Sprintf("\n--- %s at %s ---\n", section, time.Now().Format("2006-01-02 15:04:05"))
	if _, err := globalLogFile.WriteString(header); err != nil {
		return err
	}
	if _, err := globalLogFile.WriteString(content); err != nil {
		return err
	}
	if _, err := globalLogFile.WriteString("\n"); err != nil {
		return err
	}
	return nil
}

func TestNewService(t *testing.T) {
	svc := certsh.NewService()
	if svc == nil {
		t.Error("NewService returned nil")
	}
}

func TestService_LiveCertificate(t *testing.T) {
	svc := certsh.NewService()
	ctx := context.Background()

	// Test with valid domain
	cert, err := svc.LiveCertificate(ctx, "deepseek.com")
	if err != nil {
		t.Fatalf("LiveCertificate failed: %v", err)
	}
	if cert == nil {
		t.Fatal("Expected certificate, got nil")
	}
	if cert.CommonName == "" {
		t.Error("Expected common name, got empty")
	}
	
	t.Logf("Live certificate for deepseek.com:")
	t.Logf("  Organization: %s", cert.Organization)
	t.Logf("  Common Name: %s", cert.CommonName)
	t.Logf("  Issuer: %s", cert.Issuer)
	t.Logf("  Not Before: %s", cert.NotBefore)
	t.Logf("  Not After: %s", cert.NotAfter)
	if len(cert.SAN) > 0 {
		t.Logf("  SANs: %v", cert.SAN)
	}
}

func TestService_LiveCertificate_EmptyDomain(t *testing.T) {
	svc := certsh.NewService()
	_, err := svc.LiveCertificate(context.Background(), "")
	if err == nil {
		t.Error("Expected error for empty domain, got nil")
	}
}

// Integration test - queries crt.sh API
func TestService_Scan_Integration(t *testing.T) {
	if os.Getenv("INTEGRATION_TEST") == "" {
		t.Skip("Skipping integration test. Set INTEGRATION_TEST=1 to run")
	}

	target := "deepseek.com"
	svc := certsh.NewService()
	
	// Use LIKE for faster search (ILIKE is slower and times out)
	svc.SetMatch("LIKE")
	
	result, err := svc.Scan(context.Background(), domain.ScanRequest{
		Target: target,
		Flags:  nil,
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
	if err := appendToLog("Scan: "+target, result.Output); err != nil {
		t.Logf("Warning: failed to write log file: %v", err)
	} else {
		t.Logf("Log appended to global test log")
	}

	t.Logf("Output:\n%s", result.Output)
}

// Test live certificate check with integration
func TestService_LiveCertificate_Integration(t *testing.T) {
	if os.Getenv("INTEGRATION_TEST") == "" {
		t.Skip("Skipping integration test. Set INTEGRATION_TEST=1 to run")
	}

	domains := []string{"deepseek.com", "www.deepseek.com", "api.deepseek.com"}
	svc := certsh.NewService()
	ctx := context.Background()

	for _, domain := range domains {
		t.Run(domain, func(t *testing.T) {
			cert, err := svc.LiveCertificate(ctx, domain)
			if err != nil {
				t.Fatalf("LiveCertificate failed for %s: %v", domain, err)
			}
			
			output := fmt.Sprintf("Domain: %s\nCommon Name: %s\nIssuer: %s\nValid: %s to %s\n",
				domain, cert.CommonName, cert.Issuer, cert.NotBefore, cert.NotAfter)
			
			if err := appendToLog("Certificate: "+domain, output); err != nil {
				t.Logf("Warning: failed to write log: %v", err)
			}
			t.Logf("Certificate for %s is valid", domain)
		})
	}
}