package nmap

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/phantoma/server/internal/domain"
	nmapsvc "github.com/phantoma/server/internal/service/nmap"
	"github.com/phantoma/server/pkg/logger"
	"github.com/phantoma/server/pkg/response"
)

var log = logger.WithContext("NmapHandler")

// Handler handles HTTP requests for nmap scanning.
type Handler struct {
	scanner domain.Scanner
}

func NewHandler(scanner domain.Scanner) *Handler {
	return &Handler{scanner: scanner}
}

func (h *Handler) Scan(w http.ResponseWriter, r *http.Request) {
	var req domain.ScanRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Target == "" {
		response.Error(w, http.StatusBadRequest, "target is required")
		return
	}

	log.Info("Scan — starting", logger.F("target", req.Target), logger.F("flags", req.Flags))

	// Check if XML output is requested (for structured port data)
	wantsXML := false
	for _, flag := range req.Flags {
		if strings.Contains(flag, "-oX") {
			wantsXML = true
			break
		}
	}

	// If XML requested, ensure -oX - is present (stdout)
	if wantsXML {
		hasStdoutDash := false
		for i, flag := range req.Flags {
			if flag == "-oX" && i+1 < len(req.Flags) && req.Flags[i+1] == "-" {
				hasStdoutDash = true
				break
			}
		}
		if !hasStdoutDash {
			// Add -oX - to flags
			req.Flags = append(req.Flags, "-oX", "-")
		}
	}

	result, err := h.scanner.Scan(r.Context(), req)
	if err != nil {
		log.Error("Scan — failed", logger.F("target", req.Target), logger.F("error", err))
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	if !result.Success {
		log.Warn("Scan — nmap error", logger.F("target", req.Target), logger.F("stderr", result.Error))
		response.Error(w, http.StatusBadGateway, result.Error)
		return
	}

	// If XML was requested, parse and return structured data
	if wantsXML {
		ports, parseErr := nmapsvc.ParseNmapXML(result.Output)
		if parseErr != nil {
			log.Warn("Scan — XML parse failed, returning raw output",
				logger.F("target", req.Target),
				logger.F("error", parseErr),
			)
			// Fallback: return raw output
			response.JSON(w, http.StatusOK, domain.PortScanResult{
				Target:    req.Target,
				Ports:     []domain.PortEntry{},
				RawOutput: result.Output,
			})
			return
		}
		log.Info("Scan — complete with XML parse", logger.F("target", req.Target), logger.F("ports", len(ports)))
		response.JSON(w, http.StatusOK, domain.PortScanResult{
			Target:    req.Target,
			Ports:     ports,
			RawOutput: result.Output,
		})
		return
	}

	log.Info("Scan — complete", logger.F("target", req.Target), logger.F("success", result.Success))
	response.JSON(w, http.StatusOK, result)
}
