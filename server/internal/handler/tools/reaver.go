package tools

import (
	"encoding/json"
	"net/http"

	servicetools "github.com/phantoma/server/internal/service/tools"
	"github.com/phantoma/server/pkg/response"
)

// ReaverHandler handles HTTP requests for servicetools.WPS attacks.
type ReaverHandler struct {
	service *servicetools.ReaverService
}

// NewReaverHandler creates a new servicetools.handler.
func NewReaverHandler(svc *servicetools.ReaverService) *ReaverHandler {
	return &ReaverHandler{service: svc}
}

// StartAttack handles POST /api/v1/wireless/wps/start
func (h *ReaverHandler) StartAttack(w http.ResponseWriter, r *http.Request) {
	var req servicetools.ReaverRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Interface == "" {
		response.Error(w, http.StatusBadRequest, "interface is required")
		return
	}
	if req.BSSID == "" {
		response.Error(w, http.StatusBadRequest, "bssid is required")
		return
	}

	attackID, err := h.service.StartAttack(req)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	response.JSON(w, http.StatusOK, servicetools.ReaverResponse{AttackID: attackID})
}

// StopAttack handles POST /api/v1/wireless/wps/stop
func (h *ReaverHandler) StopAttack(w http.ResponseWriter, r *http.Request) {
	attackID := r.URL.Query().Get("id")
	if attackID == "" {
		response.Error(w, http.StatusBadRequest, "attack id is required")
		return
	}

	result, err := h.service.StopAttack(attackID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	response.JSON(w, http.StatusOK, result)
}

// GetAttackStatus handles GET /api/v1/wireless/wps/status
func (h *ReaverHandler) GetAttackStatus(w http.ResponseWriter, r *http.Request) {
	attackID := r.URL.Query().Get("id")
	if attackID == "" {
		response.Error(w, http.StatusBadRequest, "attack id is required")
		return
	}

	attack, err := h.service.GetAttackStatus(attackID)
	if err != nil {
		response.Error(w, http.StatusNotFound, err.Error())
		return
	}

	response.JSON(w, http.StatusOK, attack)
}

// ListAttacks handles GET /api/v1/wireless/wps/list
func (h *ReaverHandler) ListAttacks(w http.ResponseWriter, r *http.Request) {
	attacks := h.service.ListAttacks()
	response.JSON(w, http.StatusOK, attacks)
}