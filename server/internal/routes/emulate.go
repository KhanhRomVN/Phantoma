package routes

import (
	"net/http"

	emulateHandler "github.com/phantoma/server/internal/handler/emulate"
	emulateSvc "github.com/phantoma/server/internal/service/emulate"
)

// RegisterEmulateRoutes đăng ký các endpoints cho emulate targets CRUD + filters + repeater.
func RegisterEmulateRoutes(mux *http.ServeMux, targetSvc *emulateSvc.TargetService, filterSvc *emulateSvc.FilterService, repeaterSvc *emulateSvc.RepeaterService) {
	targetHandler := emulateHandler.NewTargetHandler(targetSvc)
	filterHandler := emulateHandler.NewFilterHandler(filterSvc)
	repeaterHandler := emulateHandler.NewRepeaterHandler(repeaterSvc)

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

	// Repeater — Requests
	mux.HandleFunc("GET /api/v1/emulate-targets/{targetId}/repeater/requests", repeaterHandler.ListRequests)
	mux.HandleFunc("GET /api/v1/emulate-targets/{targetId}/repeater/requests/", repeaterHandler.GetRequest)
	mux.HandleFunc("POST /api/v1/emulate-targets/{targetId}/repeater/requests", repeaterHandler.CreateRequest)
	mux.HandleFunc("PUT /api/v1/emulate-targets/{targetId}/repeater/requests/", repeaterHandler.UpdateRequest)
	mux.HandleFunc("DELETE /api/v1/emulate-targets/{targetId}/repeater/requests/", repeaterHandler.DeleteRequest)

	// Repeater — Payloads
	mux.HandleFunc("GET /api/v1/emulate-targets/{targetId}/repeater/requests/{requestId}/payloads", repeaterHandler.ListPayloads)
	mux.HandleFunc("PUT /api/v1/emulate-targets/{targetId}/repeater/requests/{requestId}/payloads", repeaterHandler.UpsertPayload)
	mux.HandleFunc("DELETE /api/v1/emulate-targets/{targetId}/repeater/requests/{requestId}/payloads/", repeaterHandler.DeletePayload)

	// Repeater — History
	mux.HandleFunc("GET /api/v1/emulate-targets/{targetId}/repeater/history", repeaterHandler.ListHistoryByTarget)
	mux.HandleFunc("GET /api/v1/emulate-targets/{targetId}/repeater/requests/{requestId}/history", repeaterHandler.ListHistoryByRequest)
	mux.HandleFunc("POST /api/v1/emulate-targets/{targetId}/repeater/requests/{requestId}/history", repeaterHandler.SaveHistory)
	mux.HandleFunc("GET /api/v1/emulate-targets/{targetId}/repeater/history/", repeaterHandler.GetHistoryRuns)
	mux.HandleFunc("DELETE /api/v1/emulate-targets/{targetId}/repeater/history/", repeaterHandler.DeleteHistory)
}
