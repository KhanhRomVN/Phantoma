package routes

import (
	"net/http"

	reaverhandler "github.com/phantoma/server/internal/handler/reaver"
	reaver "github.com/phantoma/server/internal/service/reaver"
)

// RegisterReaverRoutes registers WPS brute force endpoints.
func RegisterReaverRoutes(mux *http.ServeMux, svc *reaver.Service) {
	handler := reaverhandler.NewHandler(svc)
	mux.HandleFunc("POST /api/v1/wireless/wps/start", handler.StartAttack)
	mux.HandleFunc("POST /api/v1/wireless/wps/stop", handler.StopAttack)
	mux.HandleFunc("GET /api/v1/wireless/wps/status", handler.GetAttackStatus)
	mux.HandleFunc("GET /api/v1/wireless/wps/list", handler.ListAttacks)
}