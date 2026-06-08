// Package metasploit implements the Scanner interface for Metasploit Framework.
package metasploit

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/phantoma/server/internal/domain"
	dockerpkg "github.com/phantoma/server/pkg/docker"
)

const defaultTimeout = 15 * time.Minute

// Service executes metasploit scans inside the metasploit Docker container.
type Service struct {
	container string
}

// NewService creates a new metasploit service with the specified container name.
func NewService(container string) *Service {
	return &Service{container: container}
}

// Scan implements domain.Scanner.
// Target can be an IP address or hostname for port scanning.
// Common flags: -p (ports), -sV (version detection), etc.
func (s *Service) Scan(ctx context.Context, req domain.ScanRequest) (domain.ScanResult, error) {
	if req.Target == "" {
		return domain.ScanResult{}, domain.ErrInvalidTarget
	}

	ctx, cancel := context.WithTimeout(ctx, defaultTimeout)
	defer cancel()

	// Build args: Use msfconsole with TCP port scanner
	// msfconsole -q -x "use auxiliary/scanner/portscan/tcp; set RHOSTS {target}; run; exit"
	msfCommand := fmt.Sprintf(
		"msfconsole -q -x \"use auxiliary/scanner/portscan/tcp; set RHOSTS %s; run; exit\"",
		req.Target,
	)
	
	args := []string{"sh", "-c", msfCommand}

	// Append additional flags if provided (custom msf commands)
	if len(req.Flags) > 0 {
		// If flags provided, use them as custom command
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
func (s *Service) SearchModule(ctx context.Context, cve string) ([]domain.ExploitEntry, error) {
	if cve == "" {
		return nil, domain.ErrInvalidTarget
	}
	
	ctx, cancel := context.WithTimeout(ctx, defaultTimeout)
	defer cancel()
	
	// msfconsole -q -x "search cve:<cve>"
	cmd := fmt.Sprintf("msfconsole -q -x \"search cve:%s; exit\"", cve)
	args := []string{"sh", "-c", cmd}
	
	result, err := dockerpkg.Exec(ctx, s.container, args...)
	if err != nil {
		return nil, err
	}
	
	return parseMetasploitOutput(result.Stdout, cve), nil
}

// parseMetasploitOutput converts msfconsole search output to ExploitEntry slice.
func parseMetasploitOutput(output, cve string) []domain.ExploitEntry {
	var exploits []domain.ExploitEntry
	
	lines := strings.Split(output, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "=") || strings.HasPrefix(line, "Matching Modules") {
			continue
		}
		
		// Typical msfconsole search output format:
		// #  Name                                                    Disclosure Date  Rank    Check  Description
		// -  ----                                                    ---------------  ----    -----  -----------
		// 0  exploit/multi/http/struts2_content_type_ognl           2017-03-06       normal  Yes    Apache Struts 2 Content-Type OGNL
		fields := strings.Fields(line)
		if len(fields) < 2 {
			continue
		}
		
		// First field is index number, second is module path
		// Remove index number (e.g., "0" or "1")
		if len(fields) >= 2 {
			// Check if first field is a number
			if fields[0] == "=" || len(fields[0]) == 0 {
				continue
			}
			
			modulePath := fields[1]
			// Extract module name from path
			parts := strings.Split(modulePath, "/")
			moduleName := parts[len(parts)-1]
			
			exploit := domain.ExploitEntry{
				ID:          modulePath,
				Name:        moduleName,
				CVE:         cve,
				Type:        "metasploit",
				Path:        modulePath,
				Description: strings.Join(fields[2:], " "),
			}
			
			// Try to detect platform
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