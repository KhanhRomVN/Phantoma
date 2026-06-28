package tools

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/phantoma/server/internal/service/airodump"
	"github.com/phantoma/server/pkg/response"
)

// AirodumpHandler handles HTTP requests for airodump-ng operations.
type AirodumpHandler struct {
	service *airodump.Service
}

// NewAirodumpHandler creates a new airodump handler.
func NewAirodumpHandler(svc *airodump.Service) *AirodumpHandler {
	return &AirodumpHandler{service: svc}
}

// StartScanRequest represents the request body for starting a scan.
type StartScanRequest struct {
	Interface string `json:"interface"`
	Channel   int    `json:"channel"`
	Band      string `json:"band"` // 2.4, 5, all
}

// StartScanResponse represents the response for starting a scan.
type StartScanResponse struct {
	ScanID string `json:"scan_id"`
}

// StartScan handles POST /api/v1/wireless/scan/start
func (h *AirodumpHandler) StartScan(w http.ResponseWriter, r *http.Request) {
	var req StartScanRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Interface == "" {
		response.Error(w, http.StatusBadRequest, "interface is required")
		return
	}
	if req.Channel == 0 {
		req.Channel = 1 // default channel
	}
	if req.Band == "" {
		req.Band = "2.4"
	}

	scanID, err := h.service.StartScan(req.Interface, req.Channel, req.Band)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	response.JSON(w, http.StatusOK, StartScanResponse{ScanID: scanID})
}

// StopScan handles POST /api/v1/wireless/scan/stop
func (h *AirodumpHandler) StopScan(w http.ResponseWriter, r *http.Request) {
	if err := h.service.StopScan(); err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"status": "stopped"})
}

// GetResults handles GET /api/v1/wireless/scan/results
func (h *AirodumpHandler) GetResults(w http.ResponseWriter, r *http.Request) {
	results, err := h.service.GetResults()
	if err != nil {
		response.Error(w, http.StatusNotFound, err.Error())
		return
	}
	response.JSON(w, http.StatusOK, results)
}

// GetStatus handles GET /api/v1/wireless/scan/status
func (h *AirodumpHandler) GetStatus(w http.ResponseWriter, r *http.Request) {
	status := map[string]interface{}{
		"scanning": h.service.IsScanning(),
	}
	response.JSON(w, http.StatusOK, status)
}

// ScanStream handles GET /api/v1/wireless/scan/stream - Server-Sent Events
func (h *AirodumpHandler) ScanStream(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	flusher, ok := w.(http.Flusher)
	if !ok {
		response.Error(w, http.StatusInternalServerError, "Streaming not supported")
		return
	}

	// Stream results every 2 seconds
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-r.Context().Done():
			return
		case <-ticker.C:
			results, err := h.service.GetResults()
			if err != nil {
				continue
			}
			data, _ := json.Marshal(results)
			w.Write([]byte("data: " + string(data) + "\n\n"))
			flusher.Flush()
		}
	}
}