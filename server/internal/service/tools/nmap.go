package tools

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/xml"
	"strings"
	"sync"
	"time"

	"github.com/phantoma/server/internal/domain"
	dockerpkg "github.com/phantoma/server/pkg/docker"
	"github.com/phantoma/server/pkg/logger"
)

const nmapDefaultTimeout = 5 * time.Minute

var nmapLog = logger.WithContext("NmapService")

// NmapService executes nmap scans inside the nmap Docker container.
type NmapService struct {
	container   string
	activeScans sync.Map // map[string]context.CancelFunc
}

func NewNmapService(container string) *NmapService {
	return &NmapService{container: container}
}

// generateScanID creates a unique ID for a scan.
func generateScanID() string {
	bytes := make([]byte, 16)
	if _, err := rand.Read(bytes); err != nil {
		// Fallback to timestamp-based ID if crypto/rand fails
		return hex.EncodeToString([]byte(time.Now().String()))
	}
	return hex.EncodeToString(bytes)
}

// Scan executes nmap and returns channels for real-time line-by-line output.
// The lineCh receives each stdout line as it's produced. errCh receives any error.
// Both channels are closed when the scan completes.
// The returned scanID can be used to cancel the scan via CancelScan.
func (s *NmapService) Scan(ctx context.Context, req domain.ScanRequest) (string, <-chan string, <-chan error) {
	// Generate unique scan ID
	scanID := req.ScanID
	if scanID == "" {
		scanID = generateScanID()
	}

	// Create independent context for this scan (not tied to HTTP request)
	scanCtx, cancel := context.WithTimeout(context.Background(), nmapDefaultTimeout)

	// Store cancel function in activeScans map
	s.activeScans.Store(scanID, cancel)
	nmapLog.Info("scan registered", logger.F("scanId", scanID), logger.F("target", req.Target))

	// Build args: nmap [flags] [target]
	args := append([]string{"nmap"}, req.Flags...)
	args = append(args, req.Target)

	lineCh, errCh := dockerpkg.ExecStream(scanCtx, s.container, args...)

	// Wrap errCh to clean up and cancel on completion
	wrappedErrCh := make(chan error, 1)
	go func() {
		defer cancel()
		defer close(wrappedErrCh)
		defer s.activeScans.Delete(scanID)
		for err := range errCh {
			wrappedErrCh <- err
		}
		nmapLog.Info("scan completed, removed from registry", logger.F("scanId", scanID))
	}()

	return scanID, lineCh, wrappedErrCh
}

// CancelScan stops a running scan by its ID.
// Returns true if the scan was found and cancelled, false otherwise.
func (s *NmapService) CancelScan(scanID string) bool {
	val, ok := s.activeScans.Load(scanID)
	if !ok {
		nmapLog.Warn("cancel failed: scan not found", logger.F("scanId", scanID))
		return false
	}

	cancel, ok := val.(context.CancelFunc)
	if !ok {
		nmapLog.Warn("cancel failed: invalid cancel function", logger.F("scanId", scanID))
		return false
	}

	cancel()
	s.activeScans.Delete(scanID)
	nmapLog.Info("scan cancelled", logger.F("scanId", scanID))
	return true
}

// ── Nmap XML parser ──────────────────────────────────────────────────────────

type nmapRun struct {
	XMLName xml.Name   `xml:"nmaprun"`
	Hosts   []nmapHost `xml:"host"`
}

type nmapHost struct {
	Ports nmapPorts `xml:"ports"`
}

type nmapPorts struct {
	Ports []nmapPort `xml:"port"`
}

type nmapPort struct {
	Protocol string      `xml:"protocol,attr"`
	PortID   int         `xml:"portid,attr"`
	State    nmapState   `xml:"state"`
	Service  nmapService `xml:"service"`
}

type nmapState struct {
	State string `xml:"state,attr"`
}

type nmapService struct {
	Name    string `xml:"name,attr"`
	Product string `xml:"product,attr"`
	Version string `xml:"version,attr"`
}

// highRiskPorts maps well-known dangerous ports to a risk level.
var highRiskPorts = map[int]string{
	21:    "high",     // FTP
	22:    "medium",   // SSH
	23:    "critical", // Telnet
	25:    "medium",   // SMTP
	53:    "low",      // DNS
	80:    "low",      // HTTP
	443:   "low",      // HTTPS
	445:   "critical", // SMB
	1433:  "critical", // MSSQL
	1521:  "critical", // Oracle DB
	3306:  "critical", // MySQL
	3389:  "critical", // RDP
	5432:  "high",     // PostgreSQL
	5900:  "critical", // VNC
	6379:  "critical", // Redis
	8080:  "medium",   // HTTP-ALT
	8443:  "medium",   // HTTPS-ALT
	9200:  "high",     // Elasticsearch
	27017: "high",     // MongoDB
}

func nmapRiskForPort(port int, service string) string {
	if r, ok := highRiskPorts[port]; ok {
		return r
	}
	svc := strings.ToLower(service)
	switch {
	case strings.Contains(svc, "telnet") || strings.Contains(svc, "vnc"):
		return "critical"
	case strings.Contains(svc, "sql") || strings.Contains(svc, "db") || strings.Contains(svc, "redis") || strings.Contains(svc, "mongo"):
		return "critical"
	case strings.Contains(svc, "ftp") || strings.Contains(svc, "rdp") || strings.Contains(svc, "smb"):
		return "high"
	case strings.Contains(svc, "ssh") || strings.Contains(svc, "smtp"):
		return "medium"
	default:
		return "low"
	}
}

// ParseNmapXML converts nmap -oX XML output into structured PortEntry slice.
func ParseNmapXML(xmlOutput string) ([]domain.PortEntry, error) {
	var run nmapRun
	if err := xml.Unmarshal([]byte(xmlOutput), &run); err != nil {
		return nil, err
	}

	var entries []domain.PortEntry
	for _, host := range run.Hosts {
		for _, p := range host.Ports.Ports {
			product := p.Service.Product
			if p.Service.Version != "" {
				product += " " + p.Service.Version
			}
			product = strings.TrimSpace(product)

			entries = append(entries, domain.PortEntry{
				Port:    p.PortID,
				Proto:   p.Protocol,
				State:   p.State.State,
				Service: p.Service.Name,
				Product: product,
				Risk:    nmapRiskForPort(p.PortID, p.Service.Name),
				CVEs:    []string{}, // CVE enrichment is a future feature
			})
		}
	}

	return entries, nil
}