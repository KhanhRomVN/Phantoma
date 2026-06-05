package domain

// ScanPhase identifies which layer of the pipeline produced results.
type ScanPhase string

const (
	PhaseDiscover ScanPhase = "discover" // Tầng 1: RustScan / Masscan
	PhaseDeep     ScanPhase = "deep"     // Tầng 2: Nmap deep
	PhaseExploit  ScanPhase = "exploit"  // Tầng 3: Metasploit + Searchsploit
	PhaseVuln     ScanPhase = "vuln"     // Tầng 4: Nuclei + Nikto
)

// PipelineScanRequest is the input for a full 3-layer scan.
type PipelineScanRequest struct {
	Target     string   `json:"target"`
	Ports      string   `json:"ports,omitempty"`      // e.g. "1-65535" or "80,443"
	Phases     []string `json:"phases,omitempty"`     // subset: ["discover","deep","vuln"]
	NucleiTags []string `json:"nucleiTags,omitempty"` // e.g. ["cve","exposed"]
}

// PhaseResult holds the output of one pipeline phase.
type PhaseResult struct {
	Phase    ScanPhase      `json:"phase"`
	Tool     string         `json:"tool"`
	Success  bool           `json:"success"`
	Ports    []PortEntry    `json:"ports,omitempty"`
	Vulns    []VulnEntry    `json:"vulns,omitempty"`
	Exploits []ExploitEntry `json:"exploits,omitempty"`
	Raw      string         `json:"raw,omitempty"`
	Error    string         `json:"error,omitempty"`
}

// VulnEntry is a finding from Nuclei or Nikto.
type VulnEntry struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Severity    string `json:"severity"` // critical/high/medium/low/info
	URL         string `json:"url"`
	Description string `json:"description"`
	Tool        string `json:"tool"` // nuclei / nikto
}

// PipelineScanResult is the full multi-phase output.
type PipelineScanResult struct {
	Target  string        `json:"target"`
	Phases  []PhaseResult `json:"phases"`
	Summary ScanSummary   `json:"summary"`
}

// ScanSummary aggregates counts across all phases.
type ScanSummary struct {
	OpenPorts    int `json:"openPorts"`
	TotalVulns   int `json:"totalVulns"`
	CriticalVuln int `json:"criticalVuln"`
	HighVuln     int `json:"highVuln"`
}
