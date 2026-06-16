package aireplay

import (
	"encoding/json"
	"net/http"

	"github.com/phantoma/server/internal/service/aireplay"
	"github.com/phantoma/server/pkg/response"
)

// Handler handles HTTP requests for aireplay-ng deauth attacks.
type Handler struct {
	service *aireplay.Service
}

// NewHandler creates a new aireplay handler.
func NewHandler(svc *aireplay.Service) *Handler {
	return &Handler{service: svc}
}

// StartDeauth handles POST /api/v1/wireless/attack/deauth
func (h *Handler) StartDeauth(w http.ResponseWriter, r *http.Request) {
	var req aireplay.DeauthRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	attackID, err := h.service.StartDeauth(req)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	response.JSON(w, http.StatusOK, aireplay.DeauthResponse{AttackID: attackID})
}

// StopDeauth handles POST /api/v1/wireless/attack/deauth/stop
func (h *Handler) StopDeauth(w http.ResponseWriter, r *http.Request) {
	attackID := r.URL.Query().Get("id")
	if attackID == "" {
		response.Error(w, http.StatusBadRequest, "attack id is required")
		return
	}

	if err := h.service.StopDeauth(attackID); err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	response.JSON(w, http.StatusOK, map[string]string{"status": "stopped"})
}

// GetAttackStatus handles GET /api/v1/wireless/attack/deauth/status
func (h *Handler) GetAttackStatus(w http.ResponseWriter, r *http.Request) {
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

// ListAttacks handles GET /api/v1/wireless/attack/deauth/list
func (h *Handler) ListAttacks(w http.ResponseWriter, r *http.Request) {
	attacks := h.service.ListAttacks()
	response.JSON(w, http.StatusOK, attacks)
}