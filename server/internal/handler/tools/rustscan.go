package tools

import (
	"encoding/json"
	"net/http"

	"github.com/phantoma/server/internal/domain"
	"github.com/phantoma/server/internal/service/rustscan"
	"github.com/phantoma/server/pkg/response"
)

type RustscanScanRequest struct {
	Target string `json:"target"`
	Ports  string `json:"ports"` // e.g., "1-65535" or "80,443,8080"
}

type RustscanScanResponse struct {
	Success bool               `json:"success"`
	Ports   []domain.PortEntry `json:"ports,omitempty"`
	Raw     string             `json:"raw,omitempty"`
	Error   string             `json:"error,omitempty"`
}

type RustscanHandler struct {
	service *rustscan.Service
}

func NewRustscanHandler(service *rustscan.Service) *RustscanHandler {
	return &RustscanHandler{service: service}
}

// Scan handles fast port scanning with rustscan.
// POST /api/v1/rustscan/scan
// Body: { "target": "192.168.1.1", "ports": "1-1000" }
func (h *RustscanHandler) Scan(w http.ResponseWriter, r *http.Request) {
	var req RustscanScanRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Target == "" {
		response.Error(w, http.StatusBadRequest, "target is required")
		return
	}

	ports, raw, err := h.service.Scan(r.Context(), req.Target, req.Ports)
	if err != nil {
		response.JSON(w, http.StatusOK, RustscanScanResponse{
			Success: false,
			Error:   err.Error(),
			Raw:     raw,
		})
		return
	}

	response.JSON(w, http.StatusOK, RustscanScanResponse{
		Success: true,
		Ports:   ports,
		Raw:     raw,
	})
}