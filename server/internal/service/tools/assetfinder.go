package tools

import (
	"context"
	"strings"
	"time"

	"github.com/phantoma/server/internal/domain"
	dockerpkg "github.com/phantoma/server/pkg/docker"
)

const assetfinderDefaultTimeout = 15 * time.Minute

// AssetfinderService executes assetfinder scans inside the assetfinder Docker container.
type AssetfinderService struct {
	container string
}

// NewAssetfinderService creates a new assetfinder service with the specified container name.
func NewAssetfinderService(container string) *AssetfinderService {
	return &AssetfinderService{container: container}
}

// Scan implements domain.Scanner.
// Target should be a domain (e.g., "deepseek.com").
// Flags can include: -subs (include subdomains), -silent, etc.
func (s *AssetfinderService) Scan(ctx context.Context, req domain.ScanRequest) (domain.ScanResult, error) {
	if req.Target == "" {
		return domain.ScanResult{}, domain.ErrInvalidTarget
	}

	ctx, cancel := context.WithTimeout(ctx, assetfinderDefaultTimeout)
	defer cancel()

	// Build args: assetfinder --subs-only <target> or just assetfinder <target>
	args := []string{"assetfinder"}

	// Append additional flags from request
	if len(req.Flags) > 0 {
		args = append(args, req.Flags...)
	}

	// Add target as last argument
	args = append(args, req.Target)

	result, err := dockerpkg.Exec(ctx, s.container, args...)
	if err != nil {
		return domain.ScanResult{
			Success: false,
			Output:  result.Stdout,
			Error:   result.Stderr,
		}, nil
	}

	// Format output: each subdomain on a new line
	output := assetfinderFormatOutput(result.Stdout)

	return domain.ScanResult{
		Success: true,
		Output:  output,
	}, nil
}

// assetfinderFormatOutput processes assetfinder output and returns a formatted string.
// Assetfinder outputs one domain/subdomain per line.
func assetfinderFormatOutput(raw string) string {
	lines := strings.Split(strings.TrimSpace(raw), "\n")
	if len(lines) == 0 {
		return raw
	}

	// Remove empty lines
	var domains []string
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line != "" {
			domains = append(domains, line)
		}
	}

	if len(domains) == 0 {
		return "No domains found"
	}

	return strings.Join(domains, "\n")
}