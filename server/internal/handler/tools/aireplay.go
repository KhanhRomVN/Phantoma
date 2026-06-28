package tools

import (
	"encoding/json"
	"net/http"

	"github.com/phantoma/server/internal/service/aireplay"
	"github.com/phantoma/server/pkg/response"
)

// AireplayHandler handles HTTP requests for aireplay-ng deauth attacks.
type AireplayHandler struct {
	service *aireplay.Service
}

// NewAireplayHandler creates a new aireplay handler.
func NewAireplayHandler(svc *aireplay.Service) *AireplayHandler {
	return &AireplayHandler{service: svc}
}

// StartDeauth handles POST /api/v1/wireless/attack/deauth
func (h *AireplayHandler) StartDeauth(w http.ResponseWriter, r *http.Request) {
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
func (h *AireplayHandler) StopDeauth(w http.ResponseWriter, r *http.Request) {
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
func (h *AireplayHandler) GetAttackStatus(w http.ResponseWriter, r *http.Request) {
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
func (h *AireplayHandler) ListAttacks(w http.ResponseWriter, r *http.Request) {
	attacks := h.service.ListAttacks()
	response.JSON(w, http.StatusOK, attacks)
}