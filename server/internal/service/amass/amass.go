// Package amass implements the Scanner interface for OWASP Amass subdomain enumeration.
package amass

import (
	"context"
	"time"

	"github.com/phantoma/server/internal/domain"
	dockerpkg "github.com/phantoma/server/pkg/docker"
)

const defaultTimeout = 10 * time.Minute

// Service executes amass scans inside the amass Docker container.
type Service struct {
	container string
}

// NewService creates a new amass service with the specified container name.
func NewService(container string) *Service {
	return &Service{container: container}
}

// Scan implements domain.Scanner.
// Target should be a domain (e.g., "example.com").
// Flags can include: -active, -brute, -wordlist, etc.
func (s *Service) Scan(ctx context.Context, req domain.ScanRequest) (domain.ScanResult, error) {
	if req.Target == "" {
		return domain.ScanResult{}, domain.ErrInvalidTarget
	}

	ctx, cancel := context.WithTimeout(ctx, defaultTimeout)
	defer cancel()

	// Build args: amass enum -d <target>
	args := []string{"amass", "enum", "-d", req.Target}

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

	return domain.ScanResult{
		Success: true,
		Output:  result.Stdout,
	}, nil
}