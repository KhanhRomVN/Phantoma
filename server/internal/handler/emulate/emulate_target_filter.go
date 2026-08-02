package emulate

import (
	"encoding/json"
	"net/http"
	"strings"

	domainemulate "github.com/phantoma/server/internal/domain/emulate"
	svcemulate "github.com/phantoma/server/internal/service/emulate"
	"github.com/phantoma/server/pkg/response"
)

// FilterHandler xử lý HTTP requests cho emulate target filters.
type FilterHandler struct {
	service *svcemulate.FilterService
}

// NewFilterHandler tạo Filter handler mới.
func NewFilterHandler(svc *svcemulate.FilterService) *FilterHandler {
	return &FilterHandler{service: svc}
}

// extractFilterTargetID trích xuất target ID từ path dạng /api/v1/emulate-targets/{id}/filter
func extractFilterTargetID(path string) string {
	id := strings.TrimPrefix(path, "/api/v1/emulate-targets/")
	id = strings.TrimSuffix(id, "/filter")
	id = strings.TrimSuffix(id, "/")
	return id
}

// GetByTargetID handles GET /api/v1/emulate-targets/{id}/filter
func (h *FilterHandler) GetByTargetID(w http.ResponseWriter, r *http.Request) {
	targetID := extractFilterTargetID(r.URL.Path)
	if targetID == "" {
		response.Error(w, http.StatusBadRequest, "missing target id")
		return
	}

	filter, err := h.service.GetByTargetID(targetID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	if filter == nil {
		response.Error(w, http.StatusNotFound, "filter not found")
		return
	}

	response.JSON(w, http.StatusOK, filter)
}

// CreateOrUpdate handles PUT /api/v1/emulate-targets/{id}/filter
func (h *FilterHandler) CreateOrUpdate(w http.ResponseWriter, r *http.Request) {
	targetID := extractFilterTargetID(r.URL.Path)
	if targetID == "" {
		response.Error(w, http.StatusBadRequest, "missing target id")
		return
	}

	var input domainemulate.CreateTargetFilterInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body: "+err.Error())
		return
	}
	input.EmulateTargetID = targetID

	filter, err := h.service.CreateOrUpdate(targetID, input)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	response.JSON(w, http.StatusOK, filter)
}

// Delete handles DELETE /api/v1/emulate-targets/{id}/filter
func (h *FilterHandler) Delete(w http.ResponseWriter, r *http.Request) {
	targetID := extractFilterTargetID(r.URL.Path)
	if targetID == "" {
		response.Error(w, http.StatusBadRequest, "missing target id")
		return
	}

	filter, err := h.service.GetByTargetID(targetID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	if filter == nil {
		response.Error(w, http.StatusNotFound, "filter not found")
		return
	}

	deleted, err := h.service.Delete(filter.ID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	if !deleted {
		response.Error(w, http.StatusNotFound, "filter not found")
		return
	}

	response.JSON(w, http.StatusOK, map[string]bool{"deleted": true})
}