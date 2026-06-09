package routes

import (
	"net/http"

	gauhandler "github.com/phantoma/server/internal/handler/gau"
	gausvc "github.com/phantoma/server/internal/service/gau"
)

// RegisterGauRoutes registers GAU (GetAllUrls) endpoints.
func RegisterGauRoutes(mux *http.ServeMux, svc *gausvc.Service) {
	handler := gauhandler.NewHandler(svc)
	mux.HandleFunc("POST /api/v1/gau/fetch", handler.FetchURLs)
}