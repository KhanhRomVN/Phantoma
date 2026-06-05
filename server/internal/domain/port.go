package domain

// PortEntry represents a single scanned port with service/CVE info.
type PortEntry struct {
	Port    int      `json:"port"`
	Proto   string   `json:"proto"`   // tcp / udp
	State   string   `json:"state"`   // open / closed / filtered
	Service string   `json:"service"` // e.g. ssh, http
	Product string   `json:"product"` // e.g. OpenSSH 8.9p1
	Version string   `json:"version"`
	Risk    string   `json:"risk"` // critical / high / medium / low
	CVEs    []string `json:"cves"`
}

// PortScanResult is the structured response for a port scan.
type PortScanResult struct {
	Target    string      `json:"target"`
	Ports     []PortEntry `json:"ports"`
	RawOutput string      `json:"rawOutput,omitempty"`
}
