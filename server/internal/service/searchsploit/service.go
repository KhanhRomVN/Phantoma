// Package searchsploit wraps the searchsploit container for exploit searching.
package searchsploit

import (
	"context"
	"encoding/json"
	"regexp"
	"strings"
	"time"

	"github.com/phantoma/server/internal/domain"
	dockerpkg "github.com/phantoma/server/pkg/docker"
	"github.com/phantoma/server/pkg/logger"
)

const defaultTimeout = 30 * time.Second

var log = logger.WithContext("Searchsploit")

type Service struct {
	container string
}

func NewService(container string) *Service {
	return &Service{container: container}
}

// SearchByCVE finds exploits for a given CVE ID.
func (s *Service) SearchByCVE(ctx context.Context, cveID string) ([]domain.ExploitEntry, error) {
	ctx, cancel := context.WithTimeout(ctx, defaultTimeout)
	defer cancel()

	// searchsploit --cve CVE-2023-1234 --json
	args := []string{"searchsploit", "--cve", cveID, "--json"}

	log.Debug("searching exploits", logger.F("cve", cveID))
	result, err := dockerpkg.Exec(ctx, s.container, args...)
	if err != nil {
		// Searchsploit returns exit code 0 even if no results found
		if result.Stderr != "" {
			log.Warn("searchsploit error", logger.F("cve", cveID), logger.F("stderr", result.Stderr))
		}
	}

	return parseSearchsploitOutput(result.Stdout, cveID), nil
}

// SearchByKeyword finds exploits by keyword.
func (s *Service) SearchByKeyword(ctx context.Context, keyword string) ([]domain.ExploitEntry, error) {
	ctx, cancel := context.WithTimeout(ctx, defaultTimeout)
	defer cancel()

	args := []string{"searchsploit", keyword, "--json"}
	result, err := dockerpkg.Exec(ctx, s.container, args...)
	if err != nil {
		return nil, err
	}

	return parseSearchsploitOutput(result.Stdout, ""), nil
}

type searchsploitResult struct {
	Exploits []struct {
		Title      string `json:"Title"`
		EDBID      string `json:"EDB-ID"`
		Date       string `json:"Date"`
		Author     string `json:"Author"`
		Type       string `json:"Type"`
		Platform   string `json:"Platform"`
		Path       string `json:"Path"`
		VulnDisco  string `json:"Vulnerable-Discovery"`
		VulnVers   string `json:"Vulnerable-Version"`
		CVE        string `json:"CVE"`
	} `json:"RESULTS_EXPLOIT"`
}

func parseSearchsploitOutput(output, cveFilter string) []domain.ExploitEntry {
	var entries []domain.ExploitEntry

	// Try to parse JSON
	var result searchsploitResult
	if err := json.Unmarshal([]byte(output), &result); err != nil {
		// Fallback to text parsing
		return parseTextOutput(output, cveFilter)
	}

	for _, e := range result.Exploits {
		// Filter by CVE if specified
		if cveFilter != "" && !strings.Contains(e.CVE, cveFilter) && !strings.Contains(e.Title, cveFilter) {
			continue
		}

		entry := domain.ExploitEntry{
			ID:          e.EDBID,
			Name:        e.Title,
			CVE:         e.CVE,
			Type:        "searchsploit",
			Path:        e.Path,
			Description: truncate(e.Title, 200),
			Platform:    e.Platform,
		}
		entries = append(entries, entry)
	}

	return entries
}

// Text parsing fallback for older searchsploit versions
func parseTextOutput(output, cveFilter string) []domain.ExploitEntry {
	var entries []domain.ExploitEntry
	lines := strings.Split(output, "\n")
	cveRegex := regexp.MustCompile(`CVE-\d{4}-\d{4,7}`)

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "Exploit Title") {
			continue
		}
		// Format: "EDB-ID | Title | Date | Author | Type | Platform | Path | CVE"
		parts := strings.SplitN(line, "|", 8)
		if len(parts) < 2 {
			continue
		}

		id := strings.TrimSpace(parts[0])
		title := strings.TrimSpace(parts[1])
		cve := ""
		if len(parts) >= 8 {
			cve = strings.TrimSpace(parts[7])
		}
		// Extract CVE from title if not in CVE column
		if cve == "" {
			if matches := cveRegex.FindString(title); matches != "" {
				cve = matches
			}
		}

		if cveFilter != "" && !strings.Contains(cve, cveFilter) && !strings.Contains(title, cveFilter) {
			continue
		}

		entries = append(entries, domain.ExploitEntry{
			ID:          id,
			Name:        title,
			CVE:         cve,
			Type:        "searchsploit",
			Description: truncate(title, 200),
		})
	}
	return entries
}

func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max] + "..."
}