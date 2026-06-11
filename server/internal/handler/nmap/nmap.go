package nmap

import (
	"encoding/json"
	"fmt"
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
	svc *nmapsvc.Service
}

func NewHandler(svc *nmapsvc.Service) *Handler {
	return &Handler{svc: svc}
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

	result, err := h.svc.Scan(r.Context(), req)
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

// ScanStream streams nmap scan output via Server-Sent Events (SSE).
// GET /api/v1/nmap/scan/stream?target=...&flags=-sV,-sC
func (h *Handler) ScanStream(w http.ResponseWriter, r *http.Request) {
	target := r.URL.Query().Get("target")
	if target == "" {
		response.Error(w, http.StatusBadRequest, "target is required")
		return
	}

	flagsStr := r.URL.Query().Get("flags")
	var flags []string
	if flagsStr != "" {
		flags = strings.Split(flagsStr, ",")
	}

	// Build scan request
	req := domain.ScanRequest{
		Target: target,
		Flags:  flags,
	}

	log.Info("ScanStream — starting", logger.F("target", req.Target), logger.F("flags", req.Flags))

	// Set SSE headers
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	flusher, ok := w.(http.Flusher)
	if !ok {
		response.Error(w, http.StatusInternalServerError, "streaming not supported")
		return
	}

	// Start the scan stream
	lineCh, errCh := h.svc.ScanStream(r.Context(), req)

	// Send initial event
	fmt.Fprintf(w, "event: start\ndata: scan started for %s\n\n", target)
	flusher.Flush()

	// Stream lines
	for {
		select {
		case line, ok := <-lineCh:
			if !ok {
				// Channel closed — scan complete
				fmt.Fprintf(w, "event: done\ndata: scan complete\n\n")
				flusher.Flush()
				log.Info("ScanStream — complete", logger.F("target", target))
				return
			}
			// Escape any newlines in the line, write SSE data
			safeLine := strings.ReplaceAll(line, "\n", "")
			safeLine = strings.ReplaceAll(safeLine, "\r", "")
			fmt.Fprintf(w, "data: %s\n\n", safeLine)
			flusher.Flush()

		case err := <-errCh:
			if err != nil {
				log.Error("ScanStream — error", logger.F("target", target), logger.F("error", err))
				fmt.Fprintf(w, "event: error\ndata: %s\n\n", err.Error())
				flusher.Flush()
			}
			return

		case <-r.Context().Done():
			log.Info("ScanStream — client disconnected", logger.F("target", target))
			return
		}
	}
}