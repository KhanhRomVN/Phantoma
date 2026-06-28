package tools

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/phantoma/server/internal/domain"
	domaintools "github.com/phantoma/server/internal/domain/tools"
	dockerpkg "github.com/phantoma/server/pkg/docker"
	"github.com/phantoma/server/pkg/logger"
)

const goDorkDefaultTimeout = 2 * time.Minute
const goDorkDefaultContainer = "go-dork"

var goDorkLog = logger.WithContext("GoDork")

// GoDorkService executes go-dork searches inside a Docker container.
type GoDorkService struct {
	container string
}

// NewGoDorkService creates a new go-dork service.
// If container is empty, uses default "go-dork".
func NewGoDorkService(container string) *GoDorkService {
	if container == "" {
		container = goDorkDefaultContainer
	}
	return &GoDorkService{container: container}
}

// Search performs a dork search using go-dork.
func (s *GoDorkService) Search(ctx context.Context, req domaintools.DorkQuery) (*domaintools.DorkResponse, error) {
	if req.Query == "" {
		return nil, domain.ErrInvalidTarget
	}

	ctx, cancel := context.WithTimeout(ctx, goDorkDefaultTimeout)
	defer cancel()

	args := s.buildArgs(req)

	goDorkLog.Info("executing dork search",
		logger.F("query", req.Query),
		logger.F("engine", req.Engine),
		logger.F("pages", req.Pages),
	)

	result, err := dockerpkg.Exec(ctx, s.container, args...)
	if err != nil {
		return nil, fmt.Errorf("docker exec failed: %w", err)
	}

	results := goDorkParseOutput(result.Stdout)

	response := &domaintools.DorkResponse{
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

	goDorkLog.Info("dork search completed",
		logger.F("query", req.Query),
		logger.F("results", len(results)),
	)

	return response, nil
}

// buildArgs constructs command-line arguments for go-dork.
func (s *GoDorkService) buildArgs(req domaintools.DorkQuery) []string {
	args := []string{"go-dork"}

	args = append(args, "-q", req.Query)
	args = append(args, "-s")

	if req.Engine != "" && req.Engine != domaintools.EngineGoogle {
		args = append(args, "-e", string(req.Engine))
	}

	if req.Pages > 1 {
		args = append(args, "-p", fmt.Sprintf("%d", req.Pages))
	}

	if req.Proxy != "" {
		args = append(args, "-x", req.Proxy)
	}

	for _, header := range req.Headers {
		if header != "" {
			args = append(args, "-H", header)
		}
	}

	return args
}

// goDorkParseOutput extracts URLs and titles from go-dork output.
func goDorkParseOutput(output string) []domaintools.DorkResult {
	var results []domaintools.DorkResult
	lines := strings.Split(output, "\n")

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		result := domaintools.DorkResult{}

		if strings.HasPrefix(line, "http://") || strings.HasPrefix(line, "https://") {
			parts := strings.SplitN(line, " ", 2)
			result.URL = parts[0]
			if len(parts) > 1 {
				result.Title = strings.TrimSpace(parts[1])
			}
			results = append(results, result)
		} else if strings.Contains(line, "|") {
			parts := strings.SplitN(line, "|", 2)
			if len(parts) == 2 {
				result.Title = strings.TrimSpace(parts[0])
				result.URL = strings.TrimSpace(parts[1])
				results = append(results, result)
			}
		} else {
			result.URL = line
			results = append(results, result)
		}
	}

	return results
}