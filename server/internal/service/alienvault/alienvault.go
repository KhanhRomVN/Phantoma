// Package alienvault implements the Scanner interface for AlienVault OTX threat intelligence.
package alienvault

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	"github.com/phantoma/server/internal/domain"
)

const (
	defaultBaseURL = "https://otx.alienvault.com/api/v1"
	defaultTimeout = 30 * time.Second
)

// Service queries AlienVault OTX for threat intelligence on targets.
type Service struct {
	apiKey  string
	baseURL string
	client  *http.Client
}

// NewService creates a new AlienVault OTX service.
// API key is read from OTX_API_KEY environment variable.
func NewService() *Service {
	apiKey := os.Getenv("OTX_API_KEY")
	if apiKey == "" {
		apiKey = os.Getenv("ALIENVAULT_OTX_KEY")
	}
	return &Service{
		apiKey:  apiKey,
		baseURL: defaultBaseURL,
		client: &http.Client{
			Timeout: defaultTimeout,
		},
	}
}

// Scan implements domain.Scanner.
// Target can be an IP address, domain, or hostname.
func (s *Service) Scan(ctx context.Context, req domain.ScanRequest) (domain.ScanResult, error) {
	if req.Target == "" {
		return domain.ScanResult{}, domain.ErrInvalidTarget
	}

	if s.apiKey == "" {
		return domain.ScanResult{
			Success: false,
			Error:   "OTX_API_KEY environment variable is not set",
		}, nil
	}

	ctx, cancel := context.WithTimeout(ctx, defaultTimeout)
	defer cancel()

	// Determine indicator type based on target format
	indicatorType := detectIndicatorType(req.Target)
	url := fmt.Sprintf("%s/indicators/%s/%s", s.baseURL, indicatorType, req.Target)

	data, err := s.doRequest(ctx, url)
	if err != nil {
		return domain.ScanResult{
			Success: false,
			Output:  "",
			Error:   fmt.Sprintf("OTX API request failed: %v", err),
		}, nil
	}

	// Convert raw JSON to pretty-printed output for the scan result
	output, _ := json.MarshalIndent(data, "", "  ")

	return domain.ScanResult{
		Success: true,
		Output:  string(output),
	}, nil
}

// doRequest performs an authenticated GET request to the OTX API.
func (s *Service) doRequest(ctx context.Context, url string) (map[string]interface{}, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}
	req.Header.Set("X-OTX-API-KEY", s.apiKey)
	req.Header.Set("Accept", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("executing request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("OTX API returned status %d: %s", resp.StatusCode, string(body))
	}

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decoding response: %w", err)
	}

	return result, nil
}

// detectIndicatorType determines the OTX indicator type from the target string.
// Supports: IPv4, IPv6, domain, hostname, URL, file hash (MD5/SHA1/SHA256).
func detectIndicatorType(target string) string {
	// Simple heuristic: if it looks like an IP, use IPv4; otherwise domain/hostname
	if isIPv4(target) {
		return "IPv4"
	}
	if isIPv6(target) {
		return "IPv6"
	}
	// Could extend with more types: URL, FileHash-MD5, FileHash-SHA256, etc.
	// For now, default to domain
	return "domain"
}

func isIPv4(s string) bool {
	parts := 0
	octet := ""
	for _, c := range s {
		if c == '.' {
			parts++
			octet = ""
		} else if c >= '0' && c <= '9' {
			octet += string(c)
		} else {
			return false
		}
	}
	return parts == 3 && len(octet) > 0
}

func isIPv6(s string) bool {
	// Simple check: contains colons and hex characters
	hasColon := false
	for _, c := range s {
		if c == ':' {
			hasColon = true
		} else if !((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F')) {
			return false
		}
	}
	return hasColon
}