package routes

import (
	"net/http"

	"github.com/phantoma/server/internal/config"
	"github.com/phantoma/server/internal/middleware"
	repoemulate "github.com/phantoma/server/internal/repository/emulate"
	svcemulate "github.com/phantoma/server/internal/service/emulate"
)

// NewRouter wires up all routes and returns the root http.Handler.
func NewRouter(cfg *config.Config) http.Handler {
	mux := http.NewServeMux()

	// Initialize repository
	emulateTargetRepo := repoemulate.NewTargetRepository()
	emulateFilterRepo := repoemulate.NewFilterRepository()
	emulateRepeaterRepo := repoemulate.NewRepeaterRepository()
	emulateReportRepo := repoemulate.NewReportRepository()

	// Initialize services
	emulateTargetSvc := svcemulate.NewTargetService(emulateTargetRepo)
	emulateFilterSvc := svcemulate.NewFilterService(emulateFilterRepo)
	emulateRepeaterSvc := svcemulate.NewRepeaterService(emulateRepeaterRepo)
	emulateReportSvc := svcemulate.NewReportService(emulateReportRepo)

	// Register all route groups
	RegisterHealthRoutes(mux)
	RegisterDatabaseRoutes(mux, cfg)
	RegisterEmulateRoutes(mux, emulateTargetSvc, emulateFilterSvc, emulateRepeaterSvc, emulateReportSvc)

	// Apply middleware stack: CORS → RequestLogger → mux
	return cors(middleware.RequestLogger(mux))
}

// cors applies CORS headers to every request.
func cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}