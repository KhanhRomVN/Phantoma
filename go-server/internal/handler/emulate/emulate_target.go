package emulate

import (
	"encoding/json"
	"net/http"
	"strings"

	domainemulate "github.com/phantoma/server/internal/domain/emulate"
	svcemulate "github.com/phantoma/server/internal/service/emulate"
	"github.com/phantoma/server/pkg/response"
)

// TargetHandler xử lý HTTP requests cho emulate targets.
type TargetHandler struct {
	service *svcemulate.TargetService
}

// NewTargetHandler tạo EmulateTarget handler mới.
func NewTargetHandler(svc *svcemulate.TargetService) *TargetHandler {
	return &TargetHandler{service: svc}
}

// List handles GET /api/v1/emulate-targets
func (h *TargetHandler) List(w http.ResponseWriter, r *http.Request) {
	targets, err := h.service.GetAll()
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	response.JSON(w, http.StatusOK, targets)
}

// GetByID handles GET /api/v1/emulate-targets/{id}
func (h *TargetHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id := extractID(r.URL.Path, "/api/v1/emulate-targets/")
	if id == "" {
		response.Error(w, http.StatusBadRequest, "missing target id")
		return
	}

	target, err := h.service.GetByID(id)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	if target == nil {
		response.Error(w, http.StatusNotFound, "target not found")
		return
	}

	response.JSON(w, http.StatusOK, target)
}

// Create handles POST /api/v1/emulate-targets
func (h *TargetHandler) Create(w http.ResponseWriter, r *http.Request) {
	var input domainemulate.CreateTargetInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body: "+err.Error())
		return
	}

	if input.Title == "" {
		response.Error(w, http.StatusBadRequest, "title is required")
		return
	}

	target, err := h.service.Create(input)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	response.JSON(w, http.StatusCreated, target)
}

// Update handles PUT /api/v1/emulate-targets/{id}
func (h *TargetHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := extractID(r.URL.Path, "/api/v1/emulate-targets/")
	if id == "" {
		response.Error(w, http.StatusBadRequest, "missing target id")
		return
	}

	var input domainemulate.UpdateTargetInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body: "+err.Error())
		return
	}

	target, err := h.service.Update(id, input)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	if target == nil {
		response.Error(w, http.StatusNotFound, "target not found")
		return
	}

	response.JSON(w, http.StatusOK, target)
}

// Delete handles DELETE /api/v1/emulate-targets/{id}
func (h *TargetHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := extractID(r.URL.Path, "/api/v1/emulate-targets/")
	if id == "" {
		response.Error(w, http.StatusBadRequest, "missing target id")
		return
	}

	deleted, err := h.service.Delete(id)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	if !deleted {
		response.Error(w, http.StatusNotFound, "target not found")
		return
	}

	response.JSON(w, http.StatusOK, map[string]bool{"deleted": true})
}

// UpdateLastUsed handles POST /api/v1/emulate-targets/{id}/use
func (h *TargetHandler) UpdateLastUsed(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path
	prefix := "/api/v1/emulate-targets/"
	trimmed := strings.TrimPrefix(path, prefix)
	parts := strings.Split(trimmed, "/")
	if len(parts) < 2 || parts[0] == "" {
		response.Error(w, http.StatusBadRequest, "missing target id")
		return
	}
	id := parts[0]

	if err := h.service.UpdateLastUsed(id); err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	response.JSON(w, http.StatusOK, map[string]bool{"success": true})
}

// extractID lấy ID từ URL path.
func extractID(path, prefix string) string {
	trimmed := strings.TrimPrefix(path, prefix)
	trimmed = strings.TrimSuffix(trimmed, "/")
	if strings.Contains(trimmed, "/") {
		return ""
	}
	return trimmed
}