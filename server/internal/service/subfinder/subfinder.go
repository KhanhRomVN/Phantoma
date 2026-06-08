// Package subfinder implements the Scanner interface for ProjectDiscovery Subfinder.
package subfinder

import (
	"context"
	"strings"
	"time"

	"github.com/phantoma/server/internal/domain"
	dockerpkg "github.com/phantoma/server/pkg/docker"
)

const defaultTimeout = 15 * time.Minute

// Service executes subfinder scans inside the subfinder Docker container.
type Service struct {
	container string
}

// NewService creates a new subfinder service with the specified container name.
func NewService(container string) *Service {
	return &Service{container: container}
}

// Scan implements domain.Scanner.
// Target should be a domain (e.g., "example.com").
// Flags can include: -silent, -active, -recursive, etc.
func (s *Service) Scan(ctx context.Context, req domain.ScanRequest) (domain.ScanResult, error) {
	if req.Target == "" {
		return domain.ScanResult{}, domain.ErrInvalidTarget
	}

	ctx, cancel := context.WithTimeout(ctx, defaultTimeout)
	defer cancel()

	// Build args: subfinder -d <target> -o /dev/stdout
	args := []string{"subfinder", "-d", req.Target, "-o", "/dev/stdout"}

	// Append additional flags from request
	if len(req.Flags) > 0 {
		args = append(args, req.Flags...)
	}

	result, err := dockerpkg.Exec(ctx, s.container, args...)
	if err != nil {
		return domain.ScanResult{
			Success: false,
			Output:  result.Stdout,
			Error:   result.Stderr,
		}, nil
	}

	// Format output: each subdomain on a new line
	output := formatOutput(result.Stdout)

	return domain.ScanResult{
		Success: true,
		Output:  output,
	}, nil
}

// formatOutput processes subfinder output and returns a formatted string.
// Subfinder outputs one subdomain per line.
func formatOutput(raw string) string {
	lines := strings.Split(strings.TrimSpace(raw), "\n")
	if len(lines) == 0 {
		return raw
	}

	// Remove empty lines and sort (optional)
	var subdomains []string
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line != "" {
			subdomains = append(subdomains, line)
		}
	}

	if len(subdomains) == 0 {
		return "No subdomains found"
	}

	return strings.Join(subdomains, "\n")
}