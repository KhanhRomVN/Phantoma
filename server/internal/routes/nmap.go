package routes

import (
	"net/http"

	nmaphandler "github.com/phantoma/server/internal/handler/nmap"
	nmapsvc "github.com/phantoma/server/internal/service/nmap"
)

// RegisterNmapRoutes registers Nmap scanning endpoints.
func RegisterNmapRoutes(mux *http.ServeMux, svc *nmapsvc.Service) {
	handler := nmaphandler.NewHandler(svc)
	mux.HandleFunc("POST /api/v1/nmap/scan", handler.Scan)
	mux.HandleFunc("GET /api/v1/nmap/scan/stream", handler.ScanStream)
}