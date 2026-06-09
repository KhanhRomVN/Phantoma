package routes

import (
	"net/http"

	rustscanhandler "github.com/phantoma/server/internal/handler/rustscan"
	"github.com/phantoma/server/internal/service/rustscan"
)

// RegisterRustscanRoutes registers rustscan fast port scanning endpoints.
func RegisterRustscanRoutes(mux *http.ServeMux, container string) {
	svc := rustscan.NewService(container)
	handler := rustscanhandler.NewHandler(svc)
	mux.HandleFunc("POST /api/v1/rustscan/scan", handler.Scan)
}