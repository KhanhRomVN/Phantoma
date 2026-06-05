package nikto

import (
	"strings"

	"github.com/phantoma/server/internal/domain"
)

// ParseNiktoOutput converts nikto text output into VulnEntry slice.
// Nikto lines look like:
// + OSVDB-3092: /admin/: This might be interesting...
// + /robots.txt: ...
func ParseNiktoOutput(output, target string) []domain.VulnEntry {
	var entries []domain.VulnEntry
	for _, line := range strings.Split(output, "\n") {
		line = strings.TrimSpace(line)
		if !strings.HasPrefix(line, "+") {
			continue
		}
		line = strings.TrimPrefix(line, "+ ")

		id := ""
		name := line
		desc := ""

		// "OSVDB-XXXX: /path: description"
		if idx := strings.Index(line, ": "); idx != -1 {
			first := line[:idx]
			rest := line[idx+2:]
			if strings.HasPrefix(first, "OSVDB-") || strings.HasPrefix(first, "CVE-") {
				id = first
				if idx2 := strings.Index(rest, ": "); idx2 != -1 {
					name = rest[:idx2]
					desc = rest[idx2+2:]
				} else {
					name = rest
				}
			} else {
				// no OSVDB prefix — path: description
				name = first
				desc = rest
			}
		}

		sev := severityFromNikto(line)
		entries = append(entries, domain.VulnEntry{
			ID:          id,
			Name:        name,
			Severity:    sev,
			URL:         target,
			Description: desc,
			Tool:        "nikto",
		})
	}
	return entries
}

func severityFromNikto(line string) string {
	l := strings.ToLower(line)
	switch {
	case strings.Contains(l, "osvdb") && (strings.Contains(l, "xss") || strings.Contains(l, "inject") || strings.Contains(l, "rce") || strings.Contains(l, "exec")):
		return "high"
	case strings.Contains(l, "osvdb") || strings.Contains(l, "cve"):
		return "medium"
	case strings.Contains(l, "debug") || strings.Contains(l, "phpmyadmin") || strings.Contains(l, "admin") || strings.Contains(l, "backup"):
		return "medium"
	default:
		return "info"
	}
}
