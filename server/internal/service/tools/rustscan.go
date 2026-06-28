package tools

import (
	"context"
	"strconv"
	"strings"
	"time"

	"github.com/phantoma/server/internal/domain"
	dockerpkg "github.com/phantoma/server/pkg/docker"
	"github.com/phantoma/server/pkg/logger"
)

const rustscanDefaultTimeout = 2 * time.Minute

var rustscanLog = logger.WithContext("RustScan")

type RustscanService struct {
	container string
}

func NewRustscanService(container string) *RustscanService {
	return &RustscanService{container: container}
}

// Scan runs rustscan to discover open ports quickly.
// Returns a list of PortEntry with state=open, no service/version detail yet.
func (s *RustscanService) Scan(ctx context.Context, target, ports string) ([]domain.PortEntry, string, error) {
	ctx, cancel := context.WithTimeout(ctx, rustscanDefaultTimeout)
	defer cancel()

	if ports == "" {
		ports = "1-65535"
	}

	// rustscan -a <target> -r <range> --greppable
	args := []string{
		"rustscan", "-a", target,
		"-r", ports,
		"--greppable", // machine-readable output
		"--timeout", "3000",
		"--ulimit", "5000",
		"--", "-sT", // pass-through to nmap: TCP connect (no root required)
	}

	rustscanLog.Info("starting", logger.F("target", target), logger.F("ports", ports))
	result, err := dockerpkg.Exec(ctx, s.container, args...)

	raw := result.Stdout
	if raw == "" {
		raw = result.Stderr
	}

	entries := parseGreppable(raw)
	rustscanLog.Info("complete", logger.F("target", target), logger.F("open", len(entries)))
	return entries, raw, err
}

// parseGreppable parses rustscan --greppable output.
// Format: Host: <ip> ()	Ports: 22/open/tcp//ssh///, 80/open/tcp//http///
func parseGreppable(output string) []domain.PortEntry {
	var entries []domain.PortEntry
	for _, line := range strings.Split(output, "\n") {
		line = strings.TrimSpace(line)
		if !strings.HasPrefix(line, "Host:") {
			continue
		}
		// Find "Ports: " section
		idx := strings.Index(line, "Ports: ")
		if idx == -1 {
			continue
		}
		portsPart := line[idx+7:]
		for _, p := range strings.Split(portsPart, ", ") {
			parts := strings.Split(strings.TrimSpace(p), "/")
			// parts[0]=port, parts[1]=state, parts[2]=proto, parts[4]=service
			if len(parts) < 3 {
				continue
			}
			portNum, err := strconv.Atoi(parts[0])
			if err != nil {
				continue
			}
			state := parts[1]
			proto := parts[2]
			service := ""
			if len(parts) >= 5 {
				service = parts[4]
			}
			entries = append(entries, domain.PortEntry{
				Port:    portNum,
				Proto:   proto,
				State:   state,
				Service: service,
				Risk:    rustscanRiskForPort(portNum),
				CVEs:    []string{},
			})
		}
	}
	return entries
}

func rustscanRiskForPort(port int) string {
	high := map[int]string{
		23: "critical", 445: "critical", 1433: "critical", 3306: "critical",
		3389: "critical", 5900: "critical", 6379: "critical", 27017: "high",
		21: "high", 5432: "high", 9200: "high", 8080: "medium", 22: "medium",
	}
	if r, ok := high[port]; ok {
		return r
	}
	return "low"
}