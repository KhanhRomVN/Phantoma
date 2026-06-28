package tools

import (
	"encoding/json"
	"net/http"

	domaintools "github.com/phantoma/server/internal/domain/tools"
	servicetools "github.com/phantoma/server/internal/service/tools"
	"github.com/phantoma/server/pkg/response"
)

type GauHandler struct {
	service *servicetools.GauService
}

func NewGauHandler(service *servicetools.GauService) *GauHandler {
	return &GauHandler{service: service}
}

// FetchURLs handles URL fetching requests.
// POST /api/v1/gau/fetch
// Body: { "domain": "example.com", "subs": true, "providers": ["wayback","otx"] }
func (h *GauHandler) FetchURLs(w http.ResponseWriter, r *http.Request) {
	var req domaintools.GAURequest
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