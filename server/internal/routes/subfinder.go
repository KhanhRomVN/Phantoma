package routes

import (
	"net/http"

	subfinderhandler "github.com/phantoma/server/internal/handler/subfinder"
	"github.com/phantoma/server/internal/service/subfinder"
)

// RegisterSubfinderRoutes registers Subfinder subdomain enumeration endpoints.
func RegisterSubfinderRoutes(mux *http.ServeMux, container string) {
	svc := subfinder.NewService(container)
	handler := subfinderhandler.NewHandler(svc)
	mux.HandleFunc("POST /api/v1/subfinder/scan", handler.Scan)
}