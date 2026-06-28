package tools

import (
	"encoding/json"
	"net/http"

	"github.com/phantoma/server/internal/domain"
	servicetools "github.com/phantoma/server/internal/service/tools"
	"github.com/phantoma/server/pkg/response"
)

type CertshHandler struct {
	service *servicetools.CertshService
}

func NewCertshHandler(service *servicetools.CertshService) *CertshHandler {
	return &CertshHandler{service: service}
}

// Scan handles certificate transparency log search.
// POST /api/v1/servicetools.scan
// Body: { "target": "example.com", "flags": [] }
func (h *CertshHandler) Scan(w http.ResponseWriter, r *http.Request) {
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
// GET /api/v1/servicetools.live?domain=example.com
func (h *CertshHandler) LiveCertificate(w http.ResponseWriter, r *http.Request) {
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