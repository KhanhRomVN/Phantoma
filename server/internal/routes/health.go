package routes

import (
	"net/http"

	"github.com/phantoma/server/internal/handler/health"
)

// RegisterHealthRoutes registers health check endpoint.
func RegisterHealthRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /health", health.Handler)
}