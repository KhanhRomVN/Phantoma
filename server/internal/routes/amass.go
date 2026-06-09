package routes

import (
	"net/http"

	amasshandler "github.com/phantoma/server/internal/handler/amass"
	"github.com/phantoma/server/internal/service/amass"
)

// RegisterAmassRoutes registers Amass subdomain enumeration endpoints.
func RegisterAmassRoutes(mux *http.ServeMux, container string) {
	svc := amass.NewService(container)
	handler := amasshandler.NewHandler(svc)
	mux.HandleFunc("POST /api/v1/amass/scan", handler.Scan)
}