package tools

import (
	"encoding/json"
	"net/http"

	"github.com/phantoma/server/internal/service/hcxdumptool"
	"github.com/phantoma/server/pkg/response"
)

// HcxdumptoolHandler handles HTTP requests for hcxdumptool PMKID capture.
type HcxdumptoolHandler struct {
	service *hcxdumptool.Service
}

// NewHcxdumptoolHandler creates a new hcxdumptool handler.
func NewHcxdumptoolHandler(svc *hcxdumptool.Service) *HcxdumptoolHandler {
	return &HcxdumptoolHandler{service: svc}
}

// StartCapture handles POST /api/v1/wireless/pmkid/start
func (h *HcxdumptoolHandler) StartCapture(w http.ResponseWriter, r *http.Request) {
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
func (h *HcxdumptoolHandler) StopCapture(w http.ResponseWriter, r *http.Request) {
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
func (h *HcxdumptoolHandler) GetCaptureStatus(w http.ResponseWriter, r *http.Request) {
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
func (h *HcxdumptoolHandler) ListCaptures(w http.ResponseWriter, r *http.Request) {
	captures := h.service.ListCaptures()
	response.JSON(w, http.StatusOK, captures)
}