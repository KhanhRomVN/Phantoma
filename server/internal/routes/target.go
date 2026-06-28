package routes

import (
	"net/http"

	targetHandler "github.com/phantoma/server/internal/handler/target"
	targetSvc "github.com/phantoma/server/internal/service/target"
)

// RegisterTargetRoutes đăng ký các endpoints cho targets CRUD.
func RegisterTargetRoutes(mux *http.ServeMux, svc *targetSvc.Service) {
	handler := targetHandler.NewHandler(svc)
	mux.HandleFunc("GET /api/v1/targets", handler.List)
	mux.HandleFunc("GET /api/v1/targets/", handler.GetByID)
	mux.HandleFunc("POST /api/v1/targets", handler.Create)
	mux.HandleFunc("PUT /api/v1/targets/", handler.Update)
	mux.HandleFunc("DELETE /api/v1/targets/", handler.Delete)
}