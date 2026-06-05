// Package nuclei wraps the nuclei container for CVE template scanning.
package nuclei

import (
	"context"
	"encoding/json"
	"strings"
	"time"

	"github.com/phantoma/server/internal/domain"
	dockerpkg "github.com/phantoma/server/pkg/docker"
	"github.com/phantoma/server/pkg/logger"
)

const defaultTimeout = 10 * time.Minute

var log = logger.WithContext("Nuclei")

type Service struct {
	container string
}

func NewService(container string) *Service {
	return &Service{container: container}
}

// Scan runs nuclei against the target with given tags (e.g. ["cve","exposed","misconfig"]).
func (s *Service) Scan(ctx context.Context, target string, tags []string) ([]domain.VulnEntry, string, error) {
	ctx, cancel := context.WithTimeout(ctx, defaultTimeout)
	defer cancel()

	if len(tags) == 0 {
		tags = []string{"cve", "exposed", "misconfig", "default-login"}
	}

	args := []string{
		"nuclei",
		"-u", target,
		"-tags", strings.Join(tags, ","),
		"-json", // machine-readable JSONL output
		"-silent",
		"-no-color",
		"-timeout", "10",
		"-retries", "1",
	}

	log.Info("starting", logger.F("target", target), logger.F("tags", tags))
	result, execErr := dockerpkg.Exec(ctx, s.container, args...)

	vulns := parseNucleiJSONL(result.Stdout)
	log.Info("complete", logger.F("target", target), logger.F("findings", len(vulns)))

	raw := result.Stdout
	if raw == "" {
		raw = result.Stderr
	}
	return vulns, raw, execErr
}

// nucleiResult is the JSONL line format nuclei -json outputs.
type nucleiResult struct {
	TemplateID string `json:"template-id"`
	Info       struct {
		Name        string `json:"name"`
		Severity    string `json:"severity"`
		Description string `json:"description"`
	} `json:"info"`
	Host      string `json:"host"`
	MatchedAt string `json:"matched-at"`
}

func parseNucleiJSONL(output string) []domain.VulnEntry {
	var entries []domain.VulnEntry
	for _, line := range strings.Split(output, "\n") {
		line = strings.TrimSpace(line)
		if line == "" || !strings.HasPrefix(line, "{") {
			continue
		}
		var r nucleiResult
		if err := json.Unmarshal([]byte(line), &r); err != nil {
			continue
		}
		entries = append(entries, domain.VulnEntry{
			ID:          r.TemplateID,
			Name:        r.Info.Name,
			Severity:    r.Info.Severity,
			URL:         r.MatchedAt,
			Description: r.Info.Description,
			Tool:        "nuclei",
		})
	}
	return entries
}
