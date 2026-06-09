package amass

import (
	"encoding/json"
	"net/http"

	"github.com/phantoma/server/internal/domain"
	"github.com/phantoma/server/internal/service/amass"
	"github.com/phantoma/server/pkg/response"
)

type Handler struct {
	service *amass.Service
}

func NewHandler(service *amass.Service) *Handler {
	return &Handler{service: service}
}

// Scan handles subdomain enumeration requests.
// POST /api/v1/amass/scan
// Body: { "target": "example.com", "flags": ["-active", "-brute"] }
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

	result, err := h.service.Scan(r.Context(), req)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	if !result.Success {
		response.Error(w, http.StatusBadRequest, result.Error)
		return
	}

	response.JSON(w, http.StatusOK, result)
}