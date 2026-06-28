package tools

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

var nmapLog = logger.WithContext("NmapHandler")

// NmapHandler handles HTTP requests for nmap scanning.
type NmapHandler struct {
	svc *nmapsvc.Service
}

func NewNmapHandler(svc *nmapsvc.Service) *NmapHandler {
	return &NmapHandler{svc: svc}
}

// Scan streams nmap scan output via Server-Sent Events (SSE).
// POST /api/v1/nmap/scan
func (h *NmapHandler) Scan(w http.ResponseWriter, r *http.Request) {
	var req domain.ScanRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Target == "" {
		response.Error(w, http.StatusBadRequest, "target is required")
		return
	}

	nmapLog.Info("Scan — starting", logger.F("target", req.Target), logger.F("flags", req.Flags))

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
	scanID, lineCh, errCh := h.svc.Scan(r.Context(), req)

	// Send initial event with scan ID
	fmt.Fprintf(w, "event: start\ndata: {\"scanId\":\"%s\",\"message\":\"scan started for %s\"}\n\n", scanID, req.Target)
	flusher.Flush()

	// Stream lines
	for {
		select {
		case line, ok := <-lineCh:
			if !ok {
				// Channel closed — scan complete
				fmt.Fprintf(w, "event: done\ndata: scan complete\n\n")
				flusher.Flush()
				nmapLog.Info("Scan — complete", logger.F("target", req.Target))
				return
			}
			// Escape any newlines in the line, write SSE data
			safeLine := strings.ReplaceAll(line, "\n", "")
			safeLine = strings.ReplaceAll(safeLine, "\r", "")
			fmt.Fprintf(w, "data: %s\n\n", safeLine)
			flusher.Flush()

		case err := <-errCh:
			if err != nil {
				nmapLog.Error("Scan — error", logger.F("target", req.Target), logger.F("error", err))
				fmt.Fprintf(w, "event: error\ndata: %s\n\n", err.Error())
				flusher.Flush()
			}
			return

		case <-r.Context().Done():
			nmapLog.Info("Scan — client disconnected", logger.F("target", req.Target))
			return
		}
	}
}

// CancelScan cancels a running nmap scan.
// POST /api/v1/nmap/scan/cancel
func (h *NmapHandler) CancelScan(w http.ResponseWriter, r *http.Request) {
	var req domain.CancelScanRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.ScanID == "" {
		response.Error(w, http.StatusBadRequest, "scanId is required")
		return
	}

	nmapLog.Info("CancelScan — received", logger.F("scanId", req.ScanID))

	ok := h.svc.CancelScan(req.ScanID)
	if !ok {
		response.Error(w, http.StatusNotFound, "scan not found or already completed")
		return
	}

	response.JSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "scan cancelled successfully",
		"scanId":  req.ScanID,
	})
}