package tools

import (
	"context"
	"time"

	"github.com/phantoma/server/internal/domain"
	dockerpkg "github.com/phantoma/server/pkg/docker"
)

const amassDefaultTimeout = 10 * time.Minute

// AmassService executes amass scans inside the amass Docker container.
type AmassService struct {
	container string
}

// NewAmassService creates a new amass service with the specified container name.
func NewAmassService(container string) *AmassService {
	return &AmassService{container: container}
}

// Scan implements domain.Scanner.
// Target should be a domain (e.g., "example.com").
// Flags can include: -active, -brute, -wordlist, etc.
func (s *AmassService) Scan(ctx context.Context, req domain.ScanRequest) (domain.ScanResult, error) {
	if req.Target == "" {
		return domain.ScanResult{}, domain.ErrInvalidTarget
	}

	ctx, cancel := context.WithTimeout(ctx, amassDefaultTimeout)
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

// ScanStream executes amass and returns channels for real-time line-by-line output.
func (s *AmassService) ScanStream(ctx context.Context, req domain.ScanRequest) (<-chan string, <-chan error) {
	ctx, cancel := context.WithTimeout(ctx, amassDefaultTimeout)

	// Build args: amass enum -d <target>
	args := []string{"amass", "enum", "-d", req.Target}
	if len(req.Flags) > 0 {
		args = append(args, req.Flags...)
	}

	lineCh, errCh := dockerpkg.ExecStream(ctx, s.container, args...)

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