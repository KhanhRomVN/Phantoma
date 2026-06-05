package handler

import (
	"net/http"

	"github.com/phantoma/server/internal/config"
	expoithandler "github.com/phantoma/server/internal/handler/exploit"
	"github.com/phantoma/server/internal/handler/health"
	niktohandler "github.com/phantoma/server/internal/handler/nikto"
	nmaphandler "github.com/phantoma/server/internal/handler/nmap"
	scanhandler "github.com/phantoma/server/internal/handler/scan"
	"github.com/phantoma/server/internal/middleware"
	metasploitsvc "github.com/phantoma/server/internal/service/metasploit"
	niktosvc "github.com/phantoma/server/internal/service/nikto"
	nmapsvc "github.com/phantoma/server/internal/service/nmap"
	searchsploitsvc "github.com/phantoma/server/internal/service/searchsploit"
)

// NewRouter wires up all routes and returns the root http.Handler.
func NewRouter(cfg *config.Config) http.Handler {
	mux := http.NewServeMux()

	// Services
	nmap := nmapsvc.NewService(cfg.NmapContainer)
	nikto := niktosvc.NewService(cfg.NiktoContainer)
	searchsploit := searchsploitsvc.NewService(cfg.SearchsploitContainer)
	metasploit := metasploitsvc.NewService(cfg.MetasploitContainer)

	// Handlers
	mux.HandleFunc("GET /health", health.Handler)
	mux.HandleFunc("POST /api/v1/nmap/scan", nmaphandler.NewHandler(nmap).Scan)
	mux.HandleFunc("POST /api/v1/nmap/portscan", nmaphandler.NewHandler(nmap).PortScan)
	mux.HandleFunc("POST /api/v1/nikto/scan", niktohandler.NewHandler(nikto).Scan)
	mux.HandleFunc("POST /api/v1/exploit/search", expoithandler.NewHandler(searchsploit, metasploit).SearchByCVE)

	// Full pipeline: Tầng 1 (RustScan) + Tầng 2 (Nmap deep) + Tầng 3 (Exploit) + Tầng 4 (Nuclei + Nikto)
	mux.HandleFunc("POST /api/v1/scan/full", scanhandler.NewHandler(cfg).FullScan)

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
