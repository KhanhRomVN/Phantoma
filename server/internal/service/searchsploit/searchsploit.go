// Package searchsploit implements the Scanner interface for Exploit-DB search.
package searchsploit

import (
	"context"
	"strings"
	"time"

	"github.com/phantoma/server/internal/domain"
	dockerpkg "github.com/phantoma/server/pkg/docker"
)

const defaultTimeout = 2 * time.Minute

// Service executes searchsploit searches inside the searchsploit Docker container.
type Service struct {
	container string
}

// NewService creates a new searchsploit service with the specified container name.
func NewService(container string) *Service {
	return &Service{container: container}
}

// Scan implements domain.Scanner.
// Target should be a search term (e.g., "apache", "wordpress", "CVE-2021-1234").
// Flags can include: -w (show URLs), --colour (color output), -t (title only), etc.
func (s *Service) Scan(ctx context.Context, req domain.ScanRequest) (domain.ScanResult, error) {
	if req.Target == "" {
		return domain.ScanResult{}, domain.ErrInvalidTarget
	}

	ctx, cancel := context.WithTimeout(ctx, defaultTimeout)
	defer cancel()

	// Build args: searchsploit [flags] [search term]
	args := []string{"searchsploit"}
	
	// Append additional flags from request
	if len(req.Flags) > 0 {
		args = append(args, req.Flags...)
	}
	
	// Add the search target (term)
	args = append(args, req.Target)

	result, err := dockerpkg.Exec(ctx, s.container, args...)
	if err != nil {
		return domain.ScanResult{
			Success: false,
			Output:  result.Stdout,
			Error:   result.Stderr,
		}, nil
	}

	// Format output: clean up and format
	output := formatOutput(result.Stdout)

	return domain.ScanResult{
		Success: true,
		Output:  output,
	}, nil
}

// SearchByCVE searches for exploits related to a specific CVE.
func (s *Service) SearchByCVE(ctx context.Context, cve string) ([]domain.ExploitEntry, error) {
	if cve == "" {
		return nil, domain.ErrInvalidTarget
	}

	// Use -j flag for JSON output if available, fallback to text parsing
	req := domain.ScanRequest{
		Target: cve,
		Flags:  []string{"-j"},
	}
	
	result, err := s.Scan(ctx, req)
	if err != nil {
		return nil, err
	}
	
	if !result.Success {
		return nil, nil
	}
	
	return parseSearchsploitOutput(result.Output, cve), nil
}

// parseSearchsploitOutput converts searchsploit output to ExploitEntry slice.
func parseSearchsploitOutput(output, cve string) []domain.ExploitEntry {
	var exploits []domain.ExploitEntry
	
	lines := strings.Split(output, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.Contains(line, "No exploits found") {
			continue
		}
		
		// Simple parsing: line format often: "EDB-ID | Title | Platform | Type | Date"
		parts := strings.Split(line, "|")
		if len(parts) < 3 {
			// Try with space separation
			fields := strings.Fields(line)
			if len(fields) < 2 {
				continue
			}
			exploit := domain.ExploitEntry{
				ID:          fields[0],
				Name:        strings.Join(fields[1:], " "),
				CVE:         cve,
				Type:        "searchsploit",
				Path:        fields[0],
				Description: strings.Join(fields[1:], " "),
			}
			exploits = append(exploits, exploit)
			continue
		}
		
		exploit := domain.ExploitEntry{
			ID:          strings.TrimSpace(parts[0]),
			Name:        strings.TrimSpace(parts[1]),
			Platform:    strings.TrimSpace(parts[2]),
			CVE:         cve,
			Type:        "searchsploit",
			Path:        strings.TrimSpace(parts[0]),
			Description: strings.TrimSpace(parts[1]),
		}
		if len(parts) > 3 {
			exploit.Type = strings.TrimSpace(parts[3])
		}
		exploits = append(exploits, exploit)
	}
	
	return exploits
}

// formatOutput processes searchsploit output and returns a formatted string.
func formatOutput(raw string) string {
	lines := strings.Split(strings.TrimSpace(raw), "\n")
	if len(lines) == 0 {
		return raw
	}

	// Filter out empty lines and separator lines
	var results []string
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line != "" && !strings.HasPrefix(line, "---") && !strings.HasPrefix(line, " Exploit") {
			results = append(results, line)
		}
	}

	if len(results) == 0 {
		return "No exploits found"
	}

	return strings.Join(results, "\n")
}