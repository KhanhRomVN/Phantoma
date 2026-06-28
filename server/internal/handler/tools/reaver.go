package tools

import (
	"encoding/json"
	"net/http"

	"github.com/phantoma/server/internal/service/reaver"
	"github.com/phantoma/server/pkg/response"
)

// ReaverHandler handles HTTP requests for reaver WPS attacks.
type ReaverHandler struct {
	service *reaver.Service
}

// NewReaverHandler creates a new reaver handler.
func NewReaverHandler(svc *reaver.Service) *ReaverHandler {
	return &ReaverHandler{service: svc}
}

// StartAttack handles POST /api/v1/wireless/wps/start
func (h *ReaverHandler) StartAttack(w http.ResponseWriter, r *http.Request) {
	var req reaver.ReaverRequest
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

	response.JSON(w, http.StatusOK, reaver.ReaverResponse{AttackID: attackID})
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