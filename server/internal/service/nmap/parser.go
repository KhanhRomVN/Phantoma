package nmap

import (
	"encoding/xml"
	"strings"

	"github.com/phantoma/server/internal/domain"
)

// ── Nmap XML structures ───────────────────────────────────────────────────────

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

// ── Risk classification ───────────────────────────────────────────────────────

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

func riskForPort(port int, service string) string {
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
				Risk:    riskForPort(p.PortID, p.Service.Name),
				CVEs:    []string{}, // CVE enrichment is a future feature
			})
		}
	}

	return entries, nil
}
