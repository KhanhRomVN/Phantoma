// Package nikto implements the Scanner interface for Nikto web vulnerability scanning.
package nikto

import (
	"context"
	"time"

	"github.com/phantoma/server/internal/domain"
	dockerpkg "github.com/phantoma/server/pkg/docker"
)

const defaultTimeout = 10 * time.Minute

// Service executes nikto scans inside the nikto Docker container.
type Service struct {
	container string
}

func NewService(container string) *Service {
	return &Service{container: container}
}

// Scan implements domain.Scanner.
func (s *Service) Scan(ctx context.Context, req domain.ScanRequest) (domain.ScanResult, error) {
	if req.Target == "" {
		return domain.ScanResult{}, domain.ErrInvalidTarget
	}

	ctx, cancel := context.WithTimeout(ctx, defaultTimeout)
	defer cancel()

	// Build args: nikto -h [target] [flags]
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
