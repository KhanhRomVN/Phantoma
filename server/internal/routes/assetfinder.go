package routes

import (
	"net/http"

	assetfinderhandler "github.com/phantoma/server/internal/handler/assetfinder"
	"github.com/phantoma/server/internal/service/assetfinder"
)

// RegisterAssetfinderRoutes registers Assetfinder subdomain discovery endpoints.
func RegisterAssetfinderRoutes(mux *http.ServeMux, container string) {
	svc := assetfinder.NewService(container)
	handler := assetfinderhandler.NewHandler(svc)
	mux.HandleFunc("POST /api/v1/assetfinder/scan", handler.Scan)
}