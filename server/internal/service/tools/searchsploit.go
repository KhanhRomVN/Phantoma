package tools

import (
	"context"
	"strings"
	"time"

	"github.com/phantoma/server/internal/domain"
	domaintools "github.com/phantoma/server/internal/domain/tools"
	dockerpkg "github.com/phantoma/server/pkg/docker"
)

const searchsploitDefaultTimeout = 2 * time.Minute

// SearchsploitService executes searchsploit searches inside the searchsploit Docker container.
type SearchsploitService struct {
	container string
}

// NewSearchsploitService creates a new searchsploit service with the specified container name.
func NewSearchsploitService(container string) *SearchsploitService {
	return &SearchsploitService{container: container}
}

// Scan implements domain.Scanner.
func (s *SearchsploitService) Scan(ctx context.Context, req domain.ScanRequest) (domain.ScanResult, error) {
	if req.Target == "" {
		return domain.ScanResult{}, domain.ErrInvalidTarget
	}

	ctx, cancel := context.WithTimeout(ctx, searchsploitDefaultTimeout)
	defer cancel()

	args := []string{"searchsploit"}
	
	if len(req.Flags) > 0 {
		args = append(args, req.Flags...)
	}
	
	args = append(args, req.Target)

	result, err := dockerpkg.Exec(ctx, s.container, args...)
	if err != nil {
		return domain.ScanResult{
			Success: false,
			Output:  result.Stdout,
			Error:   result.Stderr,
		}, nil
	}

	output := searchsploitFormatOutput(result.Stdout)

	return domain.ScanResult{
		Success: true,
		Output:  output,
	}, nil
}

// SearchByCVE searches for exploits related to a specific CVE.
func (s *SearchsploitService) SearchByCVE(ctx context.Context, cve string) ([]domaintools.ExploitEntry, error) {
	if cve == "" {
		return nil, domain.ErrInvalidTarget
	}

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
func parseSearchsploitOutput(output, cve string) []domaintools.ExploitEntry {
	var exploits []domaintools.ExploitEntry
	
	lines := strings.Split(output, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.Contains(line, "No exploits found") {
			continue
		}
		
		parts := strings.Split(line, "|")
		if len(parts) < 3 {
			fields := strings.Fields(line)
			if len(fields) < 2 {
				continue
			}
			exploit := domaintools.ExploitEntry{
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
		
		exploit := domaintools.ExploitEntry{
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

// searchsploitFormatOutput processes searchsploit output and returns a formatted string.
func searchsploitFormatOutput(raw string) string {
	lines := strings.Split(strings.TrimSpace(raw), "\n")
	if len(lines) == 0 {
		return raw
	}

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