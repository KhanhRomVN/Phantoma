// Package nmap implements the Scanner interface for nmap network scanning.
package nmap

import (
	"context"
	"time"

	"github.com/phantoma/server/internal/domain"
	dockerpkg "github.com/phantoma/server/pkg/docker"
)

const defaultTimeout = 5 * time.Minute

// Service executes nmap scans inside the nmap Docker container.
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

	// Build args: nmap [flags] [target]
	args := append([]string{"nmap"}, req.Flags...)
	args = append(args, req.Target)

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

// ScanStream executes nmap and returns channels for real-time line-by-line output.
// The lineCh receives each stdout line as it's produced. errCh receives any error.
// Both channels are closed when the scan completes.
func (s *Service) ScanStream(ctx context.Context, req domain.ScanRequest) (<-chan string, <-chan error) {
	ctx, cancel := context.WithTimeout(ctx, defaultTimeout)
	// Note: cancel is called when the goroutine in ExecStream finishes (channels close).
	// We keep a reference so the caller can also cancel via context.

	// Build args: nmap [flags] [target]
	args := append([]string{"nmap"}, req.Flags...)
	args = append(args, req.Target)

	lineCh, errCh := dockerpkg.ExecStream(ctx, s.container, args...)

	// Wrap errCh to cancel the timeout context on completion
	wrappedErrCh := make(chan error, 1)
	go func() {
		defer cancel()
		defer close(wrappedErrCh)
		for err := range errCh {
			wrappedErrCh <- err
		}
	}()

	return lineCh, wrappedErrCh
}