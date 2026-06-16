package routes

import (
	"net/http"

	hashcathandler "github.com/phantoma/server/internal/handler/hashcat"
	hashcatsvc "github.com/phantoma/server/internal/service/hashcat"
)

// RegisterHashcatRoutes registers password cracking endpoints.
func RegisterHashcatRoutes(mux *http.ServeMux, svc *hashcatsvc.Service) {
	handler := hashcathandler.NewHandler(svc)
	mux.HandleFunc("POST /api/v1/wireless/crack/start", handler.StartCrack)
	mux.HandleFunc("POST /api/v1/wireless/crack/stop", handler.StopCrack)
	mux.HandleFunc("GET /api/v1/wireless/crack/status", handler.GetJobStatus)
	mux.HandleFunc("GET /api/v1/wireless/crack/list", handler.ListJobs)
}