package routes

import (
	"net/http"

	certshhandler "github.com/phantoma/server/internal/handler/certsh"
	"github.com/phantoma/server/internal/service/certsh"
)

// RegisterCertshRoutes registers crt.sh certificate transparency endpoints.
func RegisterCertshRoutes(mux *http.ServeMux) {
	svc := certsh.NewService()
	handler := certshhandler.NewHandler(svc)
	mux.HandleFunc("POST /api/v1/certsh/scan", handler.Scan)
	mux.HandleFunc("GET /api/v1/certsh/live", handler.LiveCertificate)
}