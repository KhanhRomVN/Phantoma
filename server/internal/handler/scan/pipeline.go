// Package scan provides the multi-phase scan pipeline handler.
package scan

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/phantoma/server/internal/config"
	"github.com/phantoma/server/internal/domain"
	metasploitsvc "github.com/phantoma/server/internal/service/metasploit"
	niktosvc "github.com/phantoma/server/internal/service/nikto"
	nmapsvc "github.com/phantoma/server/internal/service/nmap"
	nucleisvc "github.com/phantoma/server/internal/service/nuclei"
	rustsvc "github.com/phantoma/server/internal/service/rustscan"
	searchsploitsvc "github.com/phantoma/server/internal/service/searchsploit"
	"github.com/phantoma/server/pkg/logger"
	"github.com/phantoma/server/pkg/response"
)

var log = logger.WithContext("Pipeline")

type Handler struct {
	cfg *config.Config
}

func NewHandler(cfg *config.Config) *Handler {
	return &Handler{cfg: cfg}
}

// FullScan runs the 3-layer pipeline:
//
//	POST /api/v1/scan/full
//	Body: { "target": "...", "ports": "1-65535", "phases": ["discover","deep","vuln"], "nucleiTags": [...] }
func (h *Handler) FullScan(w http.ResponseWriter, r *http.Request) {
	var req domain.PipelineScanRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Target == "" {
		response.Error(w, http.StatusBadRequest, "target is required")
		return
	}

	// Default: run all phases
	phases := phaseSet(req.Phases)

	log.Info("pipeline starting",
		logger.F("target", req.Target),
		logger.F("phases", req.Phases),
	)

	result := domain.PipelineScanResult{Target: req.Target}

	// ── Tầng 1: RustScan — fast port discovery ────────────────────────────
	if phases["discover"] {
		log.Info("phase 1 — RustScan", logger.F("target", req.Target))
		rs := rustsvc.NewService(h.cfg.RustScanContainer)
		ports, raw, err := rs.Scan(r.Context(), req.Target, req.Ports)

		phase := domain.PhaseResult{
			Phase:   domain.PhaseDiscover,
			Tool:    "rustscan",
			Success: err == nil,
			Ports:   ports,
			Raw:     raw,
		}
		if err != nil {
			phase.Error = err.Error()
			log.Warn("phase 1 rustscan error", logger.F("error", err))
		}
		result.Phases = append(result.Phases, phase)
		log.Info("phase 1 done", logger.F("open_ports", len(ports)))
	}

	// ── Tầng 2: Nmap deep scan on discovered ports ────────────────────────
	if phases["deep"] {
		// Use open ports from phase 1 if available, else use req.Ports
		portList := extractOpenPorts(result.Phases)
		if portList == "" {
			portList = req.Ports
		}
		if portList == "" {
			portList = "1-1000"
		}

		log.Info("phase 2 — Nmap deep", logger.F("target", req.Target), logger.F("ports", portList))

		flags := []string{"-sV", "-sC", "--script", "vuln", "-p", portList, "-oX", "-"}
		scanner := nmapsvc.NewService(h.cfg.NmapContainer)
		nmapResult, scanErr := scanner.Scan(r.Context(), domain.ScanRequest{
			Target: req.Target,
			Flags:  flags,
		})

		var entries []domain.PortEntry
		if scanErr == nil && nmapResult.Success {
			entries, _ = nmapsvc.ParseNmapXML(nmapResult.Output)
		}

		phase := domain.PhaseResult{
			Phase:   domain.PhaseDeep,
			Tool:    "nmap",
			Success: scanErr == nil && nmapResult.Success,
			Ports:   entries,
			Raw:     nmapResult.Output,
		}
		if scanErr != nil {
			phase.Error = scanErr.Error()
		} else if !nmapResult.Success {
			phase.Error = nmapResult.Error
		}
		result.Phases = append(result.Phases, phase)
		log.Info("phase 2 done", logger.F("ports_detail", len(entries)))
	}

	// ── Tầng 3: Metasploit + Searchsploit ─────────────────────────────────
	if phases["exploit"] {
		log.Info("phase 3 — Exploit search", logger.F("target", req.Target))
		
		// Collect all CVEs from previous phases
		var allCVEs []string
		cveSet := make(map[string]bool)
		for _, phase := range result.Phases {
			for _, v := range phase.Vulns {
				if v.ID != "" && !cveSet[v.ID] {
					cveSet[v.ID] = true
					allCVEs = append(allCVEs, v.ID)
				}
			}
			for _, p := range phase.Ports {
				for _, cve := range p.CVEs {
					if !cveSet[cve] {
						cveSet[cve] = true
						allCVEs = append(allCVEs, cve)
					}
				}
			}
		}

		var allExploits []domain.ExploitEntry
		searchsploitSvc := searchsploitsvc.NewService(h.cfg.SearchsploitContainer)
		metasploitSvc := metasploitsvc.NewService(h.cfg.MetasploitContainer)

		for _, cve := range allCVEs {
			log.Debug("searching exploits for CVE", logger.F("cve", cve))
			
			// Search with searchsploit
			ssExploits, err := searchsploitSvc.SearchByCVE(r.Context(), cve)
			if err == nil {
				allExploits = append(allExploits, ssExploits...)
			}
			
			// Search with metasploit
			msExploits, err := metasploitSvc.SearchModule(r.Context(), cve)
			if err == nil {
				allExploits = append(allExploits, msExploits...)
			}
		}

		exploitPhase := domain.PhaseResult{
			Phase:    domain.PhaseExploit,
			Tool:     "searchsploit+metasploit",
			Success:  true,
			Exploits: allExploits,
		}
		result.Phases = append(result.Phases, exploitPhase)
		log.Info("exploit search done", logger.F("exploits_found", len(allExploits)))
	}

	// ── Tầng 4: Nuclei + Nikto ─────────────────────────────────────────────
	if phases["vuln"] {
		// Build URL from target
		targetURL := req.Target
		if !strings.HasPrefix(targetURL, "http") {
			targetURL = "http://" + targetURL
		}

		// Nuclei
		log.Info("phase 4 — Nuclei", logger.F("target", targetURL))
		nucSvc := nucleisvc.NewService(h.cfg.NucleiContainer)
		nucVulns, nucRaw, nucErr := nucSvc.Scan(r.Context(), targetURL, req.NucleiTags)

		nucPhase := domain.PhaseResult{
			Phase:   domain.PhaseVuln,
			Tool:    "nuclei",
			Success: nucErr == nil,
			Vulns:   nucVulns,
			Raw:     nucRaw,
		}
		if nucErr != nil {
			nucPhase.Error = nucErr.Error()
		}
		result.Phases = append(result.Phases, nucPhase)
		log.Info("nuclei done", logger.F("findings", len(nucVulns)))

		// Nikto
		log.Info("phase 4 — Nikto", logger.F("target", targetURL))
		niktoSvc := niktosvc.NewService(h.cfg.NiktoContainer)
		niktoResult, niktoErr := niktoSvc.Scan(r.Context(), domain.ScanRequest{Target: targetURL})
		niktoVulns := niktosvc.ParseNiktoOutput(niktoResult.Output, targetURL)

		niktoPhase := domain.PhaseResult{
			Phase:   domain.PhaseVuln,
			Tool:    "nikto",
			Success: niktoErr == nil,
			Vulns:   niktoVulns,
			Raw:     niktoResult.Output,
		}
		if niktoErr != nil {
			niktoPhase.Error = niktoErr.Error()
		}
		result.Phases = append(result.Phases, niktoPhase)
		log.Info("nikto done", logger.F("findings", len(niktoVulns)))
	}

	// ── Summary ────────────────────────────────────────────────────────────
	result.Summary = buildSummary(result.Phases)
	log.Info("pipeline complete",
		logger.F("target", req.Target),
		logger.F("open_ports", result.Summary.OpenPorts),
		logger.F("total_vulns", result.Summary.TotalVulns),
		logger.F("critical", result.Summary.CriticalVuln),
	)

	response.JSON(w, http.StatusOK, result)
}

// ── helpers ───────────────────────────────────────────────────────────────────

func phaseSet(phases []string) map[string]bool {
	if len(phases) == 0 {
		return map[string]bool{"discover": true, "deep": true, "vuln": true}
	}
	m := make(map[string]bool, len(phases))
	for _, p := range phases {
		m[p] = true
	}
	return m
}

// extractOpenPorts returns a comma-separated list of open ports from phase 1.
func extractOpenPorts(phases []domain.PhaseResult) string {
	var ports []string
	for _, ph := range phases {
		if ph.Phase == domain.PhaseDiscover {
			for _, p := range ph.Ports {
				if p.State == "open" || p.State == "" { // RustScan ports default to "open"
					ports = append(ports, strconv.Itoa(p.Port))
				}
			}
		}
	}
	return strings.Join(ports, ",")
}

func buildSummary(phases []domain.PhaseResult) domain.ScanSummary {
	seen := map[int]bool{}
	var s domain.ScanSummary
	for _, ph := range phases {
		for _, p := range ph.Ports {
			if p.State == "open" && !seen[p.Port] {
				seen[p.Port] = true
				s.OpenPorts++
			}
		}
		for _, v := range ph.Vulns {
			s.TotalVulns++
			switch strings.ToLower(v.Severity) {
			case "critical":
				s.CriticalVuln++
			case "high":
				s.HighVuln++
			}
		}
	}
	return s
}
