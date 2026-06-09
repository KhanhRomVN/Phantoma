package nuclei

import (
	"encoding/json"
	"net/http"

	"github.com/phantoma/server/internal/domain"
	"github.com/phantoma/server/internal/service/nuclei"
	"github.com/phantoma/server/pkg/response"
)

type ScanRequest struct {
	Target string   `json:"target"`
	Tags   []string `json:"tags"`
}

type ScanResponse struct {
	Success  bool               `json:"success"`
	Findings []domain.VulnEntry `json:"findings,omitempty"`
	Raw      string             `json:"raw,omitempty"`
	Error    string             `json:"error,omitempty"`
}

type Handler struct {
	service *nuclei.Service
}

func NewHandler(service *nuclei.Service) *Handler {
	return &Handler{service: service}
}

// Scan handles vulnerability scanning with nuclei.
// POST /api/v1/nuclei/scan
// Body: { "target": "https://example.com", "tags": ["cve", "exposed"] }
func (h *Handler) Scan(w http.ResponseWriter, r *http.Request) {
	var req ScanRequest
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
		response.JSON(w, http.StatusOK, ScanResponse{
			Success: false,
			Error:   err.Error(),
			Raw:     raw,
		})
		return
	}

	response.JSON(w, http.StatusOK, ScanResponse{
		Success:  true,
		Findings: findings,
		Raw:      raw,
	})
}
