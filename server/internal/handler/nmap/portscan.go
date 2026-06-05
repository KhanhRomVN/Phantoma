package nmap

import (
	"encoding/json"
	"net/http"

	"github.com/phantoma/server/internal/domain"
	nmapsvc "github.com/phantoma/server/internal/service/nmap"
	"github.com/phantoma/server/pkg/logger"
	"github.com/phantoma/server/pkg/response"
)

// PortScan runs nmap with -sV -oX and returns structured port/service data.
//
// POST /api/v1/nmap/portscan
// Body: { "target": "example.com", "flags": ["-p", "1-1000"] }
func (h *Handler) PortScan(w http.ResponseWriter, r *http.Request) {
	var req domain.ScanRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Target == "" {
		response.Error(w, http.StatusBadRequest, "target is required")
		return
	}

	log.Info("PortScan — starting",
		logger.F("target", req.Target),
		logger.F("flags", req.Flags),
	)

	// -Pn: skip host discovery (needed for targets behind CDN/firewall that block ping)
	// -sV: version detection
	// -oX -: XML output to stdout
	req.Flags = append([]string{"-Pn", "-sV", "-oX", "-"}, req.Flags...)

	result, err := h.scanner.Scan(r.Context(), req)
	if err != nil {
		log.Error("PortScan — scan failed", logger.F("target", req.Target), logger.F("error", err))
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	if !result.Success {
		log.Warn("PortScan — nmap error", logger.F("target", req.Target), logger.F("stderr", result.Error))
		response.Error(w, http.StatusBadGateway, result.Error)
		return
	}

	// Parse XML output into structured ports
	ports, err := nmapsvc.ParseNmapXML(result.Output)
	if err != nil {
		log.Warn("PortScan — XML parse failed, returning raw output",
			logger.F("target", req.Target),
			logger.F("error", err),
		)
		// Fallback: return raw output so the UI can still show something
		response.JSON(w, http.StatusOK, domain.PortScanResult{
			Target:    req.Target,
			Ports:     []domain.PortEntry{},
			RawOutput: result.Output,
		})
		return
	}

	log.Info("PortScan — complete",
		logger.F("target", req.Target),
		logger.F("ports", len(ports)),
	)

	response.JSON(w, http.StatusOK, domain.PortScanResult{
		Target: req.Target,
		Ports:  ports,
	})
}
