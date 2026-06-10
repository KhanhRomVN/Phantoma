package routes

import (
	"net/http"

	alienvaultHandler "github.com/phantoma/server/internal/handler/alienvault"
	alienvaultSvc "github.com/phantoma/server/internal/service/alienvault"
)

// RegisterAlienvaultRoutes registers AlienVault OTX lookup endpoints.
func RegisterAlienvaultRoutes(mux *http.ServeMux, svc *alienvaultSvc.Service) {
	handler := alienvaultHandler.NewHandler(svc)
	mux.HandleFunc("POST /api/v1/alienvault/scan", handler.Scan)
}