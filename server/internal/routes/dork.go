package routes

import (
	"net/http"

	dorkhandler "github.com/phantoma/server/internal/handler/dork"
	godork "github.com/phantoma/server/internal/service/go-dork"
)

// RegisterDorkRoutes registers Google Dorking endpoints.
func RegisterDorkRoutes(mux *http.ServeMux, svc *godork.Service) {
	handler := dorkhandler.NewHandler(svc)
	mux.HandleFunc("POST /api/v1/dork/search", handler.Search)
}