package tools

import (
	"encoding/json"
	"net/http"

	"github.com/phantoma/server/internal/domain"
	servicetools "github.com/phantoma/server/internal/service/tools"
	"github.com/phantoma/server/pkg/response"
)

type NucleiScanRequest struct {
	Target string   `json:"target"`
	Tags   []string `json:"tags"`
}

type NucleiScanResponse struct {
	Success  bool               `json:"success"`
	Findings []domain.VulnEntry `json:"findings,omitempty"`
	Raw      string             `json:"raw,omitempty"`
	Error    string             `json:"error,omitempty"`
}

type NucleiHandler struct {
	service *servicetools.NucleiService
}

func NewNucleiHandler(service *servicetools.NucleiService) *NucleiHandler {
	return &NucleiHandler{service: service}
}

// Scan handles vulnerability scanning with servicetools.
// POST /api/v1/servicetools.scan
// Body: { "target": "https://example.com", "tags": ["cve", "exposed"] }
func (h *NucleiHandler) Scan(w http.ResponseWriter, r *http.Request) {
	var req NucleiScanRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Target == "" {
		response.Error(w, http.StatusBadRequest, "target is required")
		return
	}

	findings, raw, err := h.service.Scan(r.Context(), req.Target, req.Tags)
	if err != nil {
		response.JSON(w, http.StatusOK, NucleiScanResponse{
			Success: false,
			Error:   err.Error(),
			Raw:     raw,
		})
		return
	}

	response.JSON(w, http.StatusOK, NucleiScanResponse{
		Success:  true,
		Findings: findings,
		Raw:      raw,
	})
}
