package hcxdumptool

import (
	"encoding/json"
	"net/http"

	"github.com/phantoma/server/internal/service/hcxdumptool"
	"github.com/phantoma/server/pkg/response"
)

// Handler handles HTTP requests for hcxdumptool PMKID capture.
type Handler struct {
	service *hcxdumptool.Service
}

// NewHandler creates a new hcxdumptool handler.
func NewHandler(svc *hcxdumptool.Service) *Handler {
	return &Handler{service: svc}
}

// StartCapture handles POST /api/v1/wireless/pmkid/start
func (h *Handler) StartCapture(w http.ResponseWriter, r *http.Request) {
	var req hcxdumptool.CaptureRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Interface == "" {
		response.Error(w, http.StatusBadRequest, "interface is required")
		return
	}

	captureID, err := h.service.StartCapture(req)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	response.JSON(w, http.StatusOK, hcxdumptool.CaptureResponse{CaptureID: captureID})
}

// StopCapture handles POST /api/v1/wireless/pmkid/stop
func (h *Handler) StopCapture(w http.ResponseWriter, r *http.Request) {
	captureID := r.URL.Query().Get("id")
	if captureID == "" {
		response.Error(w, http.StatusBadRequest, "capture id is required")
		return
	}

	result, err := h.service.StopCapture(captureID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	response.JSON(w, http.StatusOK, result)
}

// GetCaptureStatus handles GET /api/v1/wireless/pmkid/status
func (h *Handler) GetCaptureStatus(w http.ResponseWriter, r *http.Request) {
	captureID := r.URL.Query().Get("id")
	if captureID == "" {
		response.Error(w, http.StatusBadRequest, "capture id is required")
		return
	}

	capture, err := h.service.GetCaptureStatus(captureID)
	if err != nil {
		response.Error(w, http.StatusNotFound, err.Error())
		return
	}

	response.JSON(w, http.StatusOK, capture)
}

// ListCaptures handles GET /api/v1/wireless/pmkid/list
func (h *Handler) ListCaptures(w http.ResponseWriter, r *http.Request) {
	captures := h.service.ListCaptures()
	response.JSON(w, http.StatusOK, captures)
}