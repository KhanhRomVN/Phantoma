package routes

import (
	"net/http"

	emulateHandler "github.com/phantoma/server/internal/handler/emulate"
	emulateSvc "github.com/phantoma/server/internal/service/emulate"
)

// RegisterEmulateRoutes đăng ký các endpoints cho emulate targets CRUD + filters.
func RegisterEmulateRoutes(mux *http.ServeMux, targetSvc *emulateSvc.TargetService, filterSvc *emulateSvc.FilterService) {
	targetHandler := emulateHandler.NewTargetHandler(targetSvc)
	filterHandler := emulateHandler.NewFilterHandler(filterSvc)

	// Target CRUD
	mux.HandleFunc("GET /api/v1/emulate-targets", targetHandler.List)
	mux.HandleFunc("GET /api/v1/emulate-targets/", targetHandler.GetByID)
	mux.HandleFunc("POST /api/v1/emulate-targets", targetHandler.Create)
	mux.HandleFunc("PUT /api/v1/emulate-targets/", targetHandler.Update)
	mux.HandleFunc("DELETE /api/v1/emulate-targets/", targetHandler.Delete)
	mux.HandleFunc("POST /api/v1/emulate-targets/{id}/use", targetHandler.UpdateLastUsed)

	// Filter endpoints
	mux.HandleFunc("GET /api/v1/emulate-targets/{id}/filter", filterHandler.GetByTargetID)
	mux.HandleFunc("PUT /api/v1/emulate-targets/{id}/filter", filterHandler.CreateOrUpdate)
	mux.HandleFunc("DELETE /api/v1/emulate-targets/{id}/filter", filterHandler.Delete)
}