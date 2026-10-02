package routes

import (
	"net/http"

	"github.com/phantoma/server/internal/config"
	"github.com/phantoma/server/internal/handler/database"
)

// RegisterDatabaseRoutes đăng ký các endpoints cho database configuration.
func RegisterDatabaseRoutes(mux *http.ServeMux, cfg *config.Config) {
	handler := database.NewHandler(cfg)
	mux.HandleFunc("GET /api/v1/database/path", handler.GetPath)
	mux.HandleFunc("PUT /api/v1/database/path", handler.UpdatePath)
}