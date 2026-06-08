// Package gau provides HTTP handlers for URL fetching using gau.
package gau

import (
	"encoding/json"
	"net/http"

	"github.com/phantoma/server/internal/domain"
	gausvc "github.com/phantoma/server/internal/service/gau"
	"github.com/phantoma/server/pkg/response"
)

type Handler struct {
	service *gausvc.Service
}

func NewHandler(service *gausvc.Service) *Handler {
	return &Handler{service: service}
}

// FetchURLs handles URL fetching requests.
// POST /api/v1/gau/fetch
// Body: { "domain": "example.com", "subs": true, "providers": ["wayback","otx"] }
func (h *Handler) FetchURLs(w http.ResponseWriter, r *http.Request) {
	var req domain.GAURequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Domain == "" {
		response.Error(w, http.StatusBadRequest, "domain is required")
		return
	}

	result, err := h.service.FetchURLs(r.Context(), req)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	response.JSON(w, http.StatusOK, result)
}