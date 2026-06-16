package routes

import (
	"net/http"

	aireplayhandler "github.com/phantoma/server/internal/handler/aireplay"
	aireplaysvc "github.com/phantoma/server/internal/service/aireplay"
)

// RegisterAireplayRoutes registers deauthentication attack endpoints.
func RegisterAireplayRoutes(mux *http.ServeMux, svc *aireplaysvc.Service) {
	handler := aireplayhandler.NewHandler(svc)
	mux.HandleFunc("POST /api/v1/wireless/attack/deauth", handler.StartDeauth)
	mux.HandleFunc("POST /api/v1/wireless/attack/deauth/stop", handler.StopDeauth)
	mux.HandleFunc("GET /api/v1/wireless/attack/deauth/status", handler.GetAttackStatus)
	mux.HandleFunc("GET /api/v1/wireless/attack/deauth/list", handler.ListAttacks)
}