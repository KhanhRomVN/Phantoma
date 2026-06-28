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

const gauDefaultTimeout = 10 * time.Minute
const gauDefaultContainer = "gau"

var gauLog = logger.WithContext("GAU")

// GauService executes gau searches inside a Docker container.
type GauService struct {
	container string
}

// NewGauService creates a new gau service.
// If container is empty, uses default "gau".
func NewGauService(container string) *GauService {
	if container == "" {
		container = gauDefaultContainer
	}
	return &GauService{container: container}
}

// FetchURLs retrieves URLs for a given domain using gau.
func (s *GauService) FetchURLs(ctx context.Context, req domaintools.GAURequest) (*domaintools.GAUResponse, error) {
	if req.Domain == "" {
		return nil, domain.ErrInvalidTarget
	}

	ctx, cancel := context.WithTimeout(ctx, gauDefaultTimeout)
	defer cancel()

	args := s.buildArgs(req)

	gauLog.Info("executing gau fetch",
		logger.F("domain", req.Domain),
		logger.F("subs", req.Subs),
		logger.F("providers", req.Providers),
	)

	result, err := dockerpkg.Exec(ctx, s.container, args...)
	if err != nil {
		return nil, fmt.Errorf("docker exec failed: %w", err)
	}

	urls := gauParseOutput(result.Stdout)

	response := &domaintools.GAUResponse{
		Domain:    req.Domain,
		URLs:      urls,
		Total:     len(urls),
		RawOutput: result.Stdout,
	}

	if err != nil && result.Stderr != "" {
		response.RawOutput = result.Stderr
	}

	gauLog.Info("gau fetch completed",
		logger.F("domain", req.Domain),
		logger.F("urls_found", len(urls)),
	)

	return response, nil
}

// buildArgs constructs command-line arguments for gau.
func (s *GauService) buildArgs(req domaintools.GAURequest) []string {
	args := []string{"gau"}

	if len(req.Providers) > 0 {
		args = append(args, "--providers", strings.Join(req.Providers, ","))
	}

	if req.Subs {
		args = append(args, "--subs")
	}

	if req.Verbose {
		args = append(args, "--verbose")
	}

	if req.Province {
		args = append(args, "--province")
	}

	if req.JSON {
		args = append(args, "--json")
	}

	if req.Blacklist != "" {
		args = append(args, "--blacklist", req.Blacklist)
	}

	if req.Whitelist != "" {
		args = append(args, "--whitelist", req.Whitelist)
	}

	if req.MatchFilter != "" {
		args = append(args, "--mc", req.MatchFilter)
	}

	if req.Filter != "" {
		args = append(args, "--fc", req.Filter)
	}

	if req.ProvidersURL != "" {
		args = append(args, "--providers-url", req.ProvidersURL)
	}

	args = append(args, req.Domain)

	return args
}

// gauParseOutput extracts URLs from gau output (one URL per line).
func gauParseOutput(output string) []string {
	var urls []string
	lines := strings.Split(output, "\n")

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		if strings.HasPrefix(line, "{") {
			urls = append(urls, line)
		} else if strings.HasPrefix(line, "http://") || strings.HasPrefix(line, "https://") {
			urls = append(urls, line)
		}
	}

	return urls
}