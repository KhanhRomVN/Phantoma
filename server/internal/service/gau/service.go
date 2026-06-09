// Package gau provides URL fetching functionality using gau (GetAllUrls).
package gau

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/phantoma/server/internal/domain"
	dockerpkg "github.com/phantoma/server/pkg/docker"
	"github.com/phantoma/server/pkg/logger"
)

const defaultTimeout = 10 * time.Minute
const defaultContainer = "gau"

var log = logger.WithContext("GAU")

// Service executes gau searches inside a Docker container.
type Service struct {
	container string
}

// NewService creates a new gau service.
// If container is empty, uses default "gau".
func NewService(container string) *Service {
	if container == "" {
		container = defaultContainer
	}
	return &Service{container: container}
}

// FetchURLs retrieves URLs for a given domain using gau.
func (s *Service) FetchURLs(ctx context.Context, req domain.GAURequest) (*domain.GAUResponse, error) {
	if req.Domain == "" {
		return nil, domain.ErrInvalidTarget
	}

	ctx, cancel := context.WithTimeout(ctx, defaultTimeout)
	defer cancel()

	// Build gau command arguments
	args := s.buildArgs(req)

	log.Info("executing gau fetch",
		logger.F("domain", req.Domain),
		logger.F("subs", req.Subs),
		logger.F("providers", req.Providers),
	)

	result, err := dockerpkg.Exec(ctx, s.container, args...)
	if err != nil {
		return nil, fmt.Errorf("docker exec failed: %w", err)
	}

	// Parse output (one URL per line)
	urls := parseOutput(result.Stdout)

	response := &domain.GAUResponse{
		Domain:    req.Domain,
		URLs:      urls,
		Total:     len(urls),
		RawOutput: result.Stdout,
	}

	if err != nil && result.Stderr != "" {
		response.RawOutput = result.Stderr
	}

	log.Info("gau fetch completed",
		logger.F("domain", req.Domain),
		logger.F("urls_found", len(urls)),
	)

	return response, nil
}

// buildArgs constructs command-line arguments for gau.
func (s *Service) buildArgs(req domain.GAURequest) []string {
	args := []string{"gau"}

	// Providers
	if len(req.Providers) > 0 {
		args = append(args, "--providers", strings.Join(req.Providers, ","))
	}

	// Subdomains
	if req.Subs {
		args = append(args, "--subs")
	}

	// Verbose
	if req.Verbose {
		args = append(args, "--verbose")
	}

	// Province mode
	if req.Province {
		args = append(args, "--province")
	}

	// JSON output
	if req.JSON {
		args = append(args, "--json")
	}

	// Blacklist
	if req.Blacklist != "" {
		args = append(args, "--blacklist", req.Blacklist)
	}

	// Whitelist
	if req.Whitelist != "" {
		args = append(args, "--whitelist", req.Whitelist)
	}

	// Match filter
	if req.MatchFilter != "" {
		args = append(args, "--mc", req.MatchFilter)
	}

	// Filter
	if req.Filter != "" {
		args = append(args, "--fc", req.Filter)
	}

	// Custom providers URL
	if req.ProvidersURL != "" {
		args = append(args, "--providers-url", req.ProvidersURL)
	}

	// Domain (required, must be last)
	args = append(args, req.Domain)

	return args
}

// parseOutput extracts URLs from gau output (one URL per line).
func parseOutput(output string) []string {
	var urls []string
	lines := strings.Split(output, "\n")

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		// If JSON output, skip parsing here (handled separately if needed)
		if strings.HasPrefix(line, "{") {
			// JSON line - could parse but for now just add raw
			urls = append(urls, line)
		} else if strings.HasPrefix(line, "http://") || strings.HasPrefix(line, "https://") {
			urls = append(urls, line)
		}
	}

	return urls
}