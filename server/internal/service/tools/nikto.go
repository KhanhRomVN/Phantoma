package tools

import (
	"context"
	"strings"
	"time"

	"github.com/phantoma/server/internal/domain"
	dockerpkg "github.com/phantoma/server/pkg/docker"
)

const niktoDefaultTimeout = 10 * time.Minute

// NiktoService executes nikto scans inside the nikto Docker container.
type NiktoService struct {
	container string
}

func NewNiktoService(container string) *NiktoService {
	return &NiktoService{container: container}
}

// Scan implements domain.Scanner.
func (s *NiktoService) Scan(ctx context.Context, req domain.ScanRequest) (domain.ScanResult, error) {
	if req.Target == "" {
		return domain.ScanResult{}, domain.ErrInvalidTarget
	}

	ctx, cancel := context.WithTimeout(ctx, niktoDefaultTimeout)
	defer cancel()

	args := append([]string{"nikto", "-h", req.Target}, req.Flags...)

	result, err := dockerpkg.Exec(ctx, s.container, args...)
	if err != nil {
		return domain.ScanResult{
			Success: false,
			Output:  result.Stdout,
			Error:   result.Stderr,
		}, nil
	}

	return domain.ScanResult{
		Success: true,
		Output:  result.Stdout,
	}, nil
}

// ParseNiktoOutput converts nikto text output into VulnEntry slice.
func ParseNiktoOutput(output, target string) []domain.VulnEntry {
	var entries []domain.VulnEntry
	for _, line := range strings.Split(output, "\n") {
		line = strings.TrimSpace(line)
		if !strings.HasPrefix(line, "+") {
			continue
		}
		line = strings.TrimPrefix(line, "+ ")

		id := ""
		name := line
		desc := ""

		if idx := strings.Index(line, ": "); idx != -1 {
			first := line[:idx]
			rest := line[idx+2:]
			if strings.HasPrefix(first, "OSVDB-") || strings.HasPrefix(first, "CVE-") {
				id = first
				if idx2 := strings.Index(rest, ": "); idx2 != -1 {
					name = rest[:idx2]
					desc = rest[idx2+2:]
				} else {
					name = rest
				}
			} else {
				name = first
				desc = rest
			}
		}

		sev := severityFromNikto(line)
		entries = append(entries, domain.VulnEntry{
			ID:          id,
			Name:        name,
			Severity:    sev,
			URL:         target,
			Description: desc,
			Tool:        "nikto",
		})
	}
	return entries
}

func severityFromNikto(line string) string {
	l := strings.ToLower(line)
	switch {
	case strings.Contains(l, "osvdb") && (strings.Contains(l, "xss") || strings.Contains(l, "inject") || strings.Contains(l, "rce") || strings.Contains(l, "exec")):
		return "high"
	case strings.Contains(l, "osvdb") || strings.Contains(l, "cve"):
		return "medium"
	case strings.Contains(l, "debug") || strings.Contains(l, "phpmyadmin") || strings.Contains(l, "admin") || strings.Contains(l, "backup"):
		return "medium"
	default:
		return "info"
	}
}