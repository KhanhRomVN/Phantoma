package routes

import (
	"net/http"

	emulatetargetHandler "github.com/phantoma/server/internal/handler/emulatetargets"
	emulatetargetSvc "github.com/phantoma/server/internal/service/emulatetargets"
)

// RegisterEmulateTargetRoutes đăng ký các endpoints cho emulate targets CRUD.
func RegisterEmulateTargetRoutes(mux *http.ServeMux, svc *emulatetargetSvc.Service) {
	handler := emulatetargetHandler.NewHandler(svc)
	mux.HandleFunc("GET /api/v1/emulate-targets", handler.List)
	mux.HandleFunc("GET /api/v1/emulate-targets/", handler.GetByID)
	mux.HandleFunc("POST /api/v1/emulate-targets", handler.Create)
	mux.HandleFunc("PUT /api/v1/emulate-targets/", handler.Update)
	mux.HandleFunc("DELETE /api/v1/emulate-targets/", handler.Delete)
	mux.HandleFunc("POST /api/v1/emulate-targets/{id}/use", handler.UpdateLastUsed)
}