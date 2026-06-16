package routes

import (
	"net/http"

	airodumphandler "github.com/phantoma/server/internal/handler/airodump"
	airodumpsvc "github.com/phantoma/server/internal/service/airodump"
)

// RegisterAirodumpRoutes registers wireless scanning endpoints.
func RegisterAirodumpRoutes(mux *http.ServeMux, svc *airodumpsvc.Service) {
	handler := airodumphandler.NewHandler(svc)
	mux.HandleFunc("POST /api/v1/wireless/scan/start", handler.StartScan)
	mux.HandleFunc("POST /api/v1/wireless/scan/stop", handler.StopScan)
	mux.HandleFunc("GET /api/v1/wireless/scan/results", handler.GetResults)
	mux.HandleFunc("GET /api/v1/wireless/scan/status", handler.GetStatus)
	mux.HandleFunc("GET /api/v1/wireless/scan/stream", handler.ScanStream)
}