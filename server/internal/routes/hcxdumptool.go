package routes

import (
	"net/http"

	hcxdumptoolhandler "github.com/phantoma/server/internal/handler/hcxdumptool"
	hcxdumptoolsvc "github.com/phantoma/server/internal/service/hcxdumptool"
)

// RegisterHcxdumptoolRoutes registers PMKID capture endpoints.
func RegisterHcxdumptoolRoutes(mux *http.ServeMux, svc *hcxdumptoolsvc.Service) {
	handler := hcxdumptoolhandler.NewHandler(svc)
	mux.HandleFunc("POST /api/v1/wireless/pmkid/start", handler.StartCapture)
	mux.HandleFunc("POST /api/v1/wireless/pmkid/stop", handler.StopCapture)
	mux.HandleFunc("GET /api/v1/wireless/pmkid/status", handler.GetCaptureStatus)
	mux.HandleFunc("GET /api/v1/wireless/pmkid/list", handler.ListCaptures)
}