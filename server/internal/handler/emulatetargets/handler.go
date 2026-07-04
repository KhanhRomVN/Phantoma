package emulatetargets

import (
	"encoding/json"
	"net/http"
	"strings"

	domainemulatetargets "github.com/phantoma/server/internal/domain/emulatetargets"
	emulatetargetSvc "github.com/phantoma/server/internal/service/emulatetargets"
	"github.com/phantoma/server/pkg/response"
)

// Handler xử lý HTTP requests cho emulate targets.
type Handler struct {
	service *emulatetargetSvc.Service
}

// NewHandler tạo EmulateTarget handler mới.
func NewHandler(svc *emulatetargetSvc.Service) *Handler {
	return &Handler{service: svc}
}

// List handles GET /api/v1/targets
func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	targets, err := h.service.GetAll()
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	response.JSON(w, http.StatusOK, targets)
}

// GetByID handles GET /api/v1/targets/{id}
func (h *Handler) GetByID(w http.ResponseWriter, r *http.Request) {
	id := extractID(r.URL.Path, "/api/v1/targets/")
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

// Create handles POST /api/v1/targets
func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	var input domainemulatetargets.CreateTargetInput
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

// Update handles PUT /api/v1/targets/{id}
func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	id := extractID(r.URL.Path, "/api/v1/targets/")
	if id == "" {
		response.Error(w, http.StatusBadRequest, "missing target id")
		return
	}

	var input domainemulatetargets.UpdateTargetInput
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

// Delete handles DELETE /api/v1/targets/{id}
func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	id := extractID(r.URL.Path, "/api/v1/targets/")
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

// UpdateLastUsed handles POST /api/v1/targets/{id}/use
func (h *Handler) UpdateLastUsed(w http.ResponseWriter, r *http.Request) {
	// Extract ID from path: /api/v1/targets/{id}/use
	path := r.URL.Path
	prefix := "/api/v1/targets/"
	trimmed := strings.TrimPrefix(path, prefix)
	// Now trimmed is "{id}/use", split by "/" and take the first part
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
// Ví dụ: "/api/v1/targets/abc-123" → "abc-123"
func extractID(path, prefix string) string {
	trimmed := strings.TrimPrefix(path, prefix)
	// Bỏ trailing slash nếu có
	trimmed = strings.TrimSuffix(trimmed, "/")
	// Nếu còn chứa "/", đó không phải ID đơn thuần
	if strings.Contains(trimmed, "/") {
		return ""
	}
	return trimmed
}