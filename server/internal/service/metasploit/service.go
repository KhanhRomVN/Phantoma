// Package metasploit wraps the Metasploit framework container.
package metasploit

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/phantoma/server/internal/domain"
	dockerpkg "github.com/phantoma/server/pkg/docker"
	"github.com/phantoma/server/pkg/logger"
)

const defaultTimeout = 5 * time.Minute

var log = logger.WithContext("Metasploit")

type Service struct {
	container string
}

func NewService(container string) *Service {
	return &Service{container: container}
}

// SearchModule searches for Metasploit modules by CVE or keyword.
func (s *Service) SearchModule(ctx context.Context, cveID string) ([]domain.ExploitEntry, error) {
	ctx, cancel := context.WithTimeout(ctx, defaultTimeout)
	defer cancel()

	// Use msfconsole -q -x "search cve:2023-1234" to search
	// Then parse output
	args := []string{
		"msfconsole", "-q", "-x",
		fmt.Sprintf("search cve:%s; exit", cveID),
	}

	log.Debug("searching msf modules", logger.F("cve", cveID))
	result, err := dockerpkg.Exec(ctx, s.container, args...)
	if err != nil {
		return nil, err
	}

	return parseMsfSearchOutput(result.Stdout, cveID), nil
}

// RunExploit runs a Metasploit module against a target.
// This is a simplified version - full automation requires more complex logic.
func (s *Service) RunExploit(ctx context.Context, modulePath, target string, port int) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Minute)
	defer cancel()

	// Build resource script or use -x with multiple commands
	// Example: use exploit/multi/handler; set RHOSTS target; set RPORT port; run
	commands := fmt.Sprintf(
		"use %s; set RHOSTS %s; set RPORT %d; run -j; exit",
		modulePath, target, port,
	)

	args := []string{"msfconsole", "-q", "-x", commands}
	result, err := dockerpkg.Exec(ctx, s.container, args...)
	if err != nil {
		return "", err
	}

	return result.Stdout, nil
}

type msfModule struct {
	Name     string
	Rank     string
	Date     string
	Check    string
	Path     string
	Desc     string
	Disclose string
}

func parseMsfSearchOutput(output, cveFilter string) []domain.ExploitEntry {
	var entries []domain.ExploitEntry
	lines := strings.Split(output, "\n")

	// Parse table output from msfconsole search
	// Format: "#  Name                                        Disclosure Date  Rank    Check  Description"
	inModuleSection := false
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if strings.Contains(line, "Matching Modules") {
			inModuleSection = true
			continue
		}
		if !inModuleSection || strings.HasPrefix(line, "=") || strings.HasPrefix(line, "-") {
			continue
		}
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		// Parse: "0   exploit/linux/http/apache_mod_cgi_bash_env  2014-09-24       excellent  Yes    Apache mod_cgi Bash Environment Variable Injection (Shellshock)"
		parts := strings.Fields(line)
		if len(parts) < 5 {
			continue
		}

		// Extract module path (usually the second field)
		var modulePath string
		for i, p := range parts {
			if i == 1 && strings.Contains(p, "/") {
				modulePath = p
				break
			}
		}
		if modulePath == "" {
			continue
		}

		// Extract rank (excellent, great, good, normal, average, low, manual)
		rank := "normal"
		for _, p := range parts {
			switch p {
			case "excellent", "great", "good", "normal", "average", "low", "manual":
				rank = p
				break
			}
		}

		// Build name from module path
		name := modulePath
		if idx := strings.LastIndex(modulePath, "/"); idx != -1 {
			name = modulePath[idx+1:]
		}
		name = strings.ReplaceAll(name, "_", " ")

		entries = append(entries, domain.ExploitEntry{
			ID:          modulePath,
			Name:        name,
			CVE:         cveFilter,
			Type:        "metasploit",
			Path:        modulePath,
			Description: fmt.Sprintf("Metasploit module: %s (Rank: %s)", name, rank),
			Privileged:  rank == "excellent" || rank == "great",
		})
	}

	return entries
}
