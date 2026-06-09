package routes

import (
	"net/http"

	nucleihandler "github.com/phantoma/server/internal/handler/nuclei"
	"github.com/phantoma/server/internal/service/nuclei"
)

// RegisterNucleiRoutes registers nuclei vulnerability scanning endpoints.
func RegisterNucleiRoutes(mux *http.ServeMux, container string) {
	svc := nuclei.NewService(container)
	handler := nucleihandler.NewHandler(svc)
	mux.HandleFunc("POST /api/v1/nuclei/scan", handler.Scan)
}