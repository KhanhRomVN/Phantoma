package handler

import (
	"net/http"

	"github.com/phantoma/server/internal/config"
	"github.com/phantoma/server/internal/handler/health"
	niktohandler "github.com/phantoma/server/internal/handler/nikto"
	nmaphandler "github.com/phantoma/server/internal/handler/nmap"
	"github.com/phantoma/server/internal/middleware"
	niktosvc "github.com/phantoma/server/internal/service/nikto"
	nmapsvc "github.com/phantoma/server/internal/service/nmap"
)

// NewRouter wires up all routes and returns the root http.Handler.
func NewRouter(cfg *config.Config) http.Handler {
	mux := http.NewServeMux()

	// Services
	nmap := nmapsvc.NewService(cfg.NmapContainer)
	nikto := niktosvc.NewService(cfg.NiktoContainer)

	// Handlers
	mux.HandleFunc("GET /health", health.Handler)
	mux.HandleFunc("POST /api/v1/nmap/scan", nmaphandler.NewHandler(nmap).Scan)
	mux.HandleFunc("POST /api/v1/nikto/scan", niktohandler.NewHandler(nikto).Scan)

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
