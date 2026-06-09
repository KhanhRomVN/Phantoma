package routes

import (
	"net/http"

	niktohandler "github.com/phantoma/server/internal/handler/nikto"
	niktosvc "github.com/phantoma/server/internal/service/nikto"
)

// RegisterNiktoRoutes registers Nikto scanning endpoints.
func RegisterNiktoRoutes(mux *http.ServeMux, svc *niktosvc.Service) {
	handler := niktohandler.NewHandler(svc)
	mux.HandleFunc("POST /api/v1/nikto/scan", handler.Scan)
}