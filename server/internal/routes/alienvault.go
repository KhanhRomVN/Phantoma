package routes

import (
	"net/http"

	alienvaulthandler "github.com/phantoma/server/internal/handler/alienvault"
	"github.com/phantoma/server/internal/service/alienvault"
)

// RegisterAlienvaultRoutes registers AlienVault OTX threat intelligence endpoints.
func RegisterAlienvaultRoutes(mux *http.ServeMux) {
	svc := alienvault.NewService()
	handler := alienvaulthandler.NewHandler(svc)
	mux.HandleFunc("POST /api/v1/alienvault/scan", handler.Scan)
}