package tools

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/phantoma/server/internal/domain"
	domaintools "github.com/phantoma/server/internal/domain/tools"
	dockerpkg "github.com/phantoma/server/pkg/docker"
)

const metasploitDefaultTimeout = 15 * time.Minute

// MetasploitService executes metasploit scans inside the metasploit Docker container.
type MetasploitService struct {
	container string
}

// NewMetasploitService creates a new metasploit service with the specified container name.
func NewMetasploitService(container string) *MetasploitService {
	return &MetasploitService{container: container}
}

// Scan implements domain.Scanner.
// Target can be an IP address or hostname for port scanning.
func (s *MetasploitService) Scan(ctx context.Context, req domain.ScanRequest) (domain.ScanResult, error) {
	if req.Target == "" {
		return domain.ScanResult{}, domain.ErrInvalidTarget
	}

	ctx, cancel := context.WithTimeout(ctx, metasploitDefaultTimeout)
	defer cancel()

	msfCommand := fmt.Sprintf(
		"msfconsole -q -x \"use auxiliary/scanner/portscan/tcp; set RHOSTS %s; run; exit\"",
		req.Target,
	)
	
	args := []string{"sh", "-c", msfCommand}

	if len(req.Flags) > 0 {
		cmd := fmt.Sprintf("msfconsole -q -x \"%s\"", req.Flags[0])
		args = []string{"sh", "-c", cmd}
	}

	result, err := dockerpkg.Exec(ctx, s.container, args...)
	if err != nil {
		return domain.ScanResult{
			Success: false,
			Output:  result.Stdout,
			Error:   result.Stderr,
		}, nil
	}

	return domain.ScanResult{
		Success: true,
		Output:  result.Stdout,
	}, nil
}

// SearchModule searches for Metasploit modules related to a specific CVE.
func (s *MetasploitService) SearchModule(ctx context.Context, cve string) ([]domaintools.ExploitEntry, error) {
	if cve == "" {
		return nil, domain.ErrInvalidTarget
	}
	
	ctx, cancel := context.WithTimeout(ctx, metasploitDefaultTimeout)
	defer cancel()
	
	cmd := fmt.Sprintf("msfconsole -q -x \"search cve:%s; exit\"", cve)
	args := []string{"sh", "-c", cmd}
	
	result, err := dockerpkg.Exec(ctx, s.container, args...)
	if err != nil {
		return nil, err
	}
	
	return parseMetasploitOutput(result.Stdout, cve), nil
}

// parseMetasploitOutput converts msfconsole search output to ExploitEntry slice.
func parseMetasploitOutput(output, cve string) []domaintools.ExploitEntry {
	var exploits []domaintools.ExploitEntry
	
	lines := strings.Split(output, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "=") || strings.HasPrefix(line, "Matching Modules") {
			continue
		}
		
		fields := strings.Fields(line)
		if len(fields) < 2 {
			continue
		}
		
		if len(fields) >= 2 {
			if fields[0] == "=" || len(fields[0]) == 0 {
				continue
			}
			
			modulePath := fields[1]
			parts := strings.Split(modulePath, "/")
			moduleName := parts[len(parts)-1]
			
			exploit := domaintools.ExploitEntry{
				ID:          modulePath,
				Name:        moduleName,
				CVE:         cve,
				Type:        "metasploit",
				Path:        modulePath,
				Description: strings.Join(fields[2:], " "),
			}
			
			if strings.Contains(modulePath, "windows") {
				exploit.Platform = "windows"
			} else if strings.Contains(modulePath, "linux") {
				exploit.Platform = "linux"
			} else if strings.Contains(modulePath, "osx") || strings.Contains(modulePath, "macos") {
				exploit.Platform = "osx"
			}
			
			exploits = append(exploits, exploit)
		}
	}
	
	return exploits
}