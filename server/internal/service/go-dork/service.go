// Package godork provides Google dorking functionality using go-dork.
package godork

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/phantoma/server/internal/domain"
	dockerpkg "github.com/phantoma/server/pkg/docker"
	"github.com/phantoma/server/pkg/logger"
)

const defaultTimeout = 2 * time.Minute
const defaultContainer = "go-dork"

var log = logger.WithContext("GoDork")

// Service executes go-dork searches inside a Docker container.
type Service struct {
	container string
}

// NewService creates a new go-dork service.
// If container is empty, uses default "go-dork".
func NewService(container string) *Service {
	if container == "" {
		container = defaultContainer
	}
	return &Service{container: container}
}

// Search performs a dork search using go-dork.
func (s *Service) Search(ctx context.Context, req domain.DorkQuery) (*domain.DorkResponse, error) {
	if req.Query == "" {
		return nil, domain.ErrInvalidTarget
	}

	ctx, cancel := context.WithTimeout(ctx, defaultTimeout)
	defer cancel()

	// Build go-dork command arguments
	args := s.buildArgs(req)

	log.Info("executing dork search",
		logger.F("query", req.Query),
		logger.F("engine", req.Engine),
		logger.F("pages", req.Pages),
	)

	result, err := dockerpkg.Exec(ctx, s.container, args...)
	if err != nil {
		return nil, fmt.Errorf("docker exec failed: %w", err)
	}

	// Parse output
	results := parseOutput(result.Stdout)

	response := &domain.DorkResponse{
		Query:     req.Query,
		Engine:    req.Engine,
		Pages:     req.Pages,
		Results:   results,
		Total:     len(results),
		RawOutput: result.Stdout,
	}

	if err != nil {
		response.RawOutput = result.Stderr
	}

	log.Info("dork search completed",
		logger.F("query", req.Query),
		logger.F("results", len(results)),
	)

	return response, nil
}

// buildArgs constructs command-line arguments for go-dork.
func (s *Service) buildArgs(req domain.DorkQuery) []string {
	args := []string{"go-dork"}

	// Query (required)
	args = append(args, "-q", req.Query)

	// Silent mode for machine-readable output
	args = append(args, "-s")

	// Engine
	if req.Engine != "" && req.Engine != domain.EngineGoogle {
		args = append(args, "-e", string(req.Engine))
	}

	// Pages
	if req.Pages > 1 {
		args = append(args, "-p", fmt.Sprintf("%d", req.Pages))
	}

	// Proxy
	if req.Proxy != "" {
		args = append(args, "-x", req.Proxy)
	}

	// Custom headers
	for _, header := range req.Headers {
		if header != "" {
			args = append(args, "-H", header)
		}
	}

	return args
}

// parseOutput extracts URLs and titles from go-dork output.
// go-dork -s outputs one result per line in format: URL (optional metadata).
func parseOutput(output string) []domain.DorkResult {
	var results []domain.DorkResult
	lines := strings.Split(output, "\n")

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		// Parse: URL | Title or just URL
		result := domain.DorkResult{}

		// Check if line contains URL pattern
		if strings.HasPrefix(line, "http://") || strings.HasPrefix(line, "https://") {
			parts := strings.SplitN(line, " ", 2)
			result.URL = parts[0]
			if len(parts) > 1 {
				result.Title = strings.TrimSpace(parts[1])
			}
			results = append(results, result)
		} else if strings.Contains(line, "|") {
			// Alternative format: Title | URL
			parts := strings.SplitN(line, "|", 2)
			if len(parts) == 2 {
				result.Title = strings.TrimSpace(parts[0])
				result.URL = strings.TrimSpace(parts[1])
				results = append(results, result)
			}
		} else {
			// Assume the whole line is a URL
			result.URL = line
			results = append(results, result)
		}
	}

	return results
}