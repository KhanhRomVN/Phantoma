package certsh

import (
	"encoding/json"
	"net/http"

	"github.com/phantoma/server/internal/domain"
	"github.com/phantoma/server/internal/service/certsh"
	"github.com/phantoma/server/pkg/response"
)

type Handler struct {
	service *certsh.Service
}

func NewHandler(service *certsh.Service) *Handler {
	return &Handler{service: service}
}

// Scan handles certificate transparency log search.
// POST /api/v1/certsh/scan
// Body: { "target": "example.com", "flags": [] }
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

// LiveCertificate retrieves the currently served certificate for a domain.
// GET /api/v1/certsh/live?domain=example.com
func (h *Handler) LiveCertificate(w http.ResponseWriter, r *http.Request) {
	domain := r.URL.Query().Get("domain")
	if domain == "" {
		response.Error(w, http.StatusBadRequest, "domain parameter is required")
		return
	}

	cert, err := h.service.LiveCertificate(r.Context(), domain)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	response.JSON(w, http.StatusOK, cert)
}