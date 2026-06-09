package routes

import (
	"net/http"

	"github.com/phantoma/server/internal/config"
	"github.com/phantoma/server/internal/middleware"
	gausvc "github.com/phantoma/server/internal/service/gau"
	dorksvc "github.com/phantoma/server/internal/service/go-dork"
	metasploitsvc "github.com/phantoma/server/internal/service/metasploit"
	niktosvc "github.com/phantoma/server/internal/service/nikto"
	nmapsvc "github.com/phantoma/server/internal/service/nmap"
	searchsploitsvc "github.com/phantoma/server/internal/service/searchsploit"
)

// NewRouter wires up all routes and returns the root http.Handler.
func NewRouter(cfg *config.Config) http.Handler {
	mux := http.NewServeMux()

	// Initialize services
	nmapSvc := nmapsvc.NewService(cfg.NmapContainer)
	niktoSvc := niktosvc.NewService(cfg.NiktoContainer)
	searchsploitSvc := searchsploitsvc.NewService(cfg.SearchsploitContainer)
	metasploitSvc := metasploitsvc.NewService(cfg.MetasploitContainer)
	dorkSvc := dorksvc.NewService(cfg.GoDorkContainer)
	gauSvc := gausvc.NewService(cfg.GauContainer)

	// Register all route groups
	RegisterHealthRoutes(mux)
	RegisterNmapRoutes(mux, nmapSvc)
	RegisterNiktoRoutes(mux, niktoSvc)
	RegisterExploitRoutes(mux, searchsploitSvc, metasploitSvc)
	RegisterDorkRoutes(mux, dorkSvc)
	RegisterGauRoutes(mux, gauSvc)
	RegisterAlienvaultRoutes(mux)
	RegisterAmassRoutes(mux, cfg.AmassContainer)
	RegisterAssetfinderRoutes(mux, cfg.AssetfinderContainer)
	RegisterCertshRoutes(mux)
	RegisterSubfinderRoutes(mux, cfg.SubfinderContainer)
	RegisterRustscanRoutes(mux, cfg.RustScanContainer)
	RegisterNucleiRoutes(mux, cfg.NucleiContainer)

	// Apply middleware stack: CORS → RequestLogger → mux
	return cors(middleware.RequestLogger(mux))
}

// cors applies CORS headers to every request.
func cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}
