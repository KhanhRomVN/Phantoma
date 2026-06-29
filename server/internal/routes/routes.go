package routes

import (
	"net/http"

	"github.com/phantoma/server/internal/config"
	"github.com/phantoma/server/internal/middleware"
	"github.com/phantoma/server/internal/repository"
	targetsvc "github.com/phantoma/server/internal/service/target"
	"github.com/phantoma/server/internal/service/tools"
)

// NewRouter wires up all routes and returns the root http.Handler.
func NewRouter(cfg *config.Config) http.Handler {
	mux := http.NewServeMux()

	// Initialize repository
	targetRepo := repository.NewTargetRepository()

	// Initialize services
	targetSvc := targetsvc.NewService(targetRepo)
	nmapSvc := tools.NewNmapService(cfg.NmapContainer)
	niktoSvc := tools.NewNiktoService(cfg.NiktoContainer)
	searchsploitSvc := tools.NewSearchsploitService(cfg.SearchsploitContainer)
	metasploitSvc := tools.NewMetasploitService(cfg.MetasploitContainer)
	dorkSvc := tools.NewGoDorkService(cfg.GoDorkContainer)
	gauSvc := tools.NewGauService(cfg.GauContainer)
	alienvaultSvc := tools.NewAlienvaultService()
	amassSvc := tools.NewAmassService(cfg.AmassContainer)
	airodumpSvc := tools.NewAirodumpService()
	aireplaySvc := tools.NewAireplayService()
	hcxdumptoolSvc := tools.NewHcxdumptoolService()
	hashcatSvc := tools.NewHashcatService()
	reaverSvc := tools.NewReaverService()

	// Register all route groups
	RegisterHealthRoutes(mux)
	RegisterTargetRoutes(mux, targetSvc)
	RegisterNmapRoutes(mux, nmapSvc)
	RegisterNiktoRoutes(mux, niktoSvc)
	RegisterExploitRoutes(mux, searchsploitSvc, metasploitSvc)
	RegisterDorkRoutes(mux, dorkSvc)
	RegisterGauRoutes(mux, gauSvc)
	RegisterAlienvaultRoutes(mux, alienvaultSvc)
	RegisterAmassRoutes(mux, amassSvc)
	RegisterAssetfinderRoutes(mux, cfg.AssetfinderContainer)
	RegisterCertshRoutes(mux)
	RegisterSubfinderRoutes(mux, cfg.SubfinderContainer)
	RegisterRustscanRoutes(mux, cfg.RustScanContainer)
	RegisterNucleiRoutes(mux, cfg.NucleiContainer)
	RegisterAirodumpRoutes(mux, airodumpSvc)
	RegisterAireplayRoutes(mux, aireplaySvc)
	RegisterHcxdumptoolRoutes(mux, hcxdumptoolSvc)
	RegisterHashcatRoutes(mux, hashcatSvc)
	RegisterReaverRoutes(mux, reaverSvc)

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
