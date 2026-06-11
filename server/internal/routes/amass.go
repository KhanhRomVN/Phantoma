package routes

import (
	"net/http"

	amasshandler "github.com/phantoma/server/internal/handler/amass"
	amasssvc "github.com/phantoma/server/internal/service/amass"
)

// RegisterAmassRoutes registers Amass subdomain enumeration endpoints.
func RegisterAmassRoutes(mux *http.ServeMux, svc *amasssvc.Service) {
	handler := amasshandler.NewHandler(svc)
	mux.HandleFunc("POST /api/v1/amass/scan", handler.Scan)
	mux.HandleFunc("GET /api/v1/amass/scan/stream", handler.ScanStream)
}