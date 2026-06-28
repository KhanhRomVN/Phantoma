package routes

import (
	"net/http"

	toolshandler "github.com/phantoma/server/internal/handler/tools"
	servicetools "github.com/phantoma/server/internal/service/tools"
)

// RegisterAireplayRoutes registers deauthentication attack endpoints.
func RegisterAireplayRoutes(mux *http.ServeMux, svc *servicetools.AireplayService) {
	handler := toolshandler.NewAireplayHandler(svc)
	mux.HandleFunc("POST /api/v1/wireless/attack/deauth", handler.StartDeauth)
	mux.HandleFunc("POST /api/v1/wireless/attack/deauth/stop", handler.StopDeauth)
	mux.HandleFunc("GET /api/v1/wireless/attack/deauth/status", handler.GetAttackStatus)
	mux.HandleFunc("GET /api/v1/wireless/attack/deauth/list", handler.ListAttacks)
}

// RegisterAirodumpRoutes registers wireless scanning endpoints.
func RegisterAirodumpRoutes(mux *http.ServeMux, svc *servicetools.AirodumpService) {
	handler := toolshandler.NewAirodumpHandler(svc)
	mux.HandleFunc("POST /api/v1/wireless/scan/start", handler.StartScan)
	mux.HandleFunc("POST /api/v1/wireless/scan/stop", handler.StopScan)
	mux.HandleFunc("GET /api/v1/wireless/scan/results", handler.GetResults)
	mux.HandleFunc("GET /api/v1/wireless/scan/status", handler.GetStatus)
	mux.HandleFunc("GET /api/v1/wireless/scan/stream", handler.ScanStream)
}

// RegisterAlienvaultRoutes registers AlienVault OTX lookup endpoints.
func RegisterAlienvaultRoutes(mux *http.ServeMux, svc *servicetools.AlienvaultService) {
	handler := toolshandler.NewAlienvaultHandler(svc)
	mux.HandleFunc("POST /api/v1/alienvault/scan", handler.Scan)
}

// RegisterAmassRoutes registers Amass subdomain enumeration endpoints.
func RegisterAmassRoutes(mux *http.ServeMux, svc *servicetools.AmassService) {
	handler := toolshandler.NewAmassHandler(svc)
	mux.HandleFunc("POST /api/v1/amass/scan", handler.Scan)
	mux.HandleFunc("GET /api/v1/amass/scan/stream", handler.ScanStream)
}

// RegisterAssetfinderRoutes registers Assetfinder subdomain discovery endpoints.
func RegisterAssetfinderRoutes(mux *http.ServeMux, container string) {
	svc := servicetools.NewAssetfinderService(container)
	handler := toolshandler.NewAssetfinderHandler(svc)
	mux.HandleFunc("POST /api/v1/assetfinder/scan", handler.Scan)
}

// RegisterCertshRoutes registers crt.sh certificate transparency endpoints.
func RegisterCertshRoutes(mux *http.ServeMux) {
	svc := servicetools.NewCertshService()
	handler := toolshandler.NewCertshHandler(svc)
	mux.HandleFunc("POST /api/v1/certsh/scan", handler.Scan)
	mux.HandleFunc("GET /api/v1/certsh/live", handler.LiveCertificate)
}

// RegisterDorkRoutes registers Google Dorking endpoints.
func RegisterDorkRoutes(mux *http.ServeMux, svc *servicetools.GoDorkService) {
	handler := toolshandler.NewDorkHandler(svc)
	mux.HandleFunc("POST /api/v1/dork/search", handler.Search)
}

// RegisterExploitRoutes registers exploit search endpoints.
func RegisterExploitRoutes(mux *http.ServeMux, searchsploitSvc *servicetools.SearchsploitService, metasploitSvc *servicetools.MetasploitService) {
	handler := toolshandler.NewExploitHandler(searchsploitSvc, metasploitSvc)
	mux.HandleFunc("POST /api/v1/exploit/search", handler.SearchByCVE)
}

// RegisterGauRoutes registers GAU (GetAllUrls) endpoints.
func RegisterGauRoutes(mux *http.ServeMux, svc *servicetools.GauService) {
	handler := toolshandler.NewGauHandler(svc)
	mux.HandleFunc("POST /api/v1/gau/fetch", handler.FetchURLs)
}

// RegisterHashcatRoutes registers password cracking endpoints.
func RegisterHashcatRoutes(mux *http.ServeMux, svc *servicetools.HashcatService) {
	handler := toolshandler.NewHashcatHandler(svc)
	mux.HandleFunc("POST /api/v1/wireless/crack/start", handler.StartCrack)
	mux.HandleFunc("POST /api/v1/wireless/crack/stop", handler.StopCrack)
	mux.HandleFunc("GET /api/v1/wireless/crack/status", handler.GetJobStatus)
	mux.HandleFunc("GET /api/v1/wireless/crack/list", handler.ListJobs)
}

// RegisterHcxdumptoolRoutes registers PMKID capture endpoints.
func RegisterHcxdumptoolRoutes(mux *http.ServeMux, svc *servicetools.HcxdumptoolService) {
	handler := toolshandler.NewHcxdumptoolHandler(svc)
	mux.HandleFunc("POST /api/v1/wireless/pmkid/start", handler.StartCapture)
	mux.HandleFunc("POST /api/v1/wireless/pmkid/stop", handler.StopCapture)
	mux.HandleFunc("GET /api/v1/wireless/pmkid/status", handler.GetCaptureStatus)
	mux.HandleFunc("GET /api/v1/wireless/pmkid/list", handler.ListCaptures)
}

// RegisterNiktoRoutes registers Nikto scanning endpoints.
func RegisterNiktoRoutes(mux *http.ServeMux, svc *servicetools.NiktoService) {
	handler := toolshandler.NewNiktoHandler(svc)
	mux.HandleFunc("POST /api/v1/nikto/scan", handler.Scan)
}

// RegisterNmapRoutes registers Nmap scanning endpoints.
func RegisterNmapRoutes(mux *http.ServeMux, svc *servicetools.NmapService) {
	handler := toolshandler.NewNmapHandler(svc)
	mux.HandleFunc("POST /api/v1/nmap/scan", handler.Scan)
	mux.HandleFunc("POST /api/v1/nmap/scan/cancel", handler.CancelScan)
}

// RegisterNucleiRoutes registers nuclei vulnerability scanning endpoints.
func RegisterNucleiRoutes(mux *http.ServeMux, container string) {
	svc := servicetools.NewNucleiService(container)
	handler := toolshandler.NewNucleiHandler(svc)
	mux.HandleFunc("POST /api/v1/nuclei/scan", handler.Scan)
}

// RegisterReaverRoutes registers WPS brute force endpoints.
func RegisterReaverRoutes(mux *http.ServeMux, svc *servicetools.ReaverService) {
	handler := toolshandler.NewReaverHandler(svc)
	mux.HandleFunc("POST /api/v1/wireless/wps/start", handler.StartAttack)
	mux.HandleFunc("POST /api/v1/wireless/wps/stop", handler.StopAttack)
	mux.HandleFunc("GET /api/v1/wireless/wps/status", handler.GetAttackStatus)
	mux.HandleFunc("GET /api/v1/wireless/wps/list", handler.ListAttacks)
}

// RegisterRustscanRoutes registers rustscan fast port scanning endpoints.
func RegisterRustscanRoutes(mux *http.ServeMux, container string) {
	svc := servicetools.NewRustscanService(container)
	handler := toolshandler.NewRustscanHandler(svc)
	mux.HandleFunc("POST /api/v1/rustscan/scan", handler.Scan)
}

// RegisterSubfinderRoutes registers Subfinder subdomain enumeration endpoints.
func RegisterSubfinderRoutes(mux *http.ServeMux, container string) {
	svc := servicetools.NewSubfinderService(container)
	handler := toolshandler.NewSubfinderHandler(svc)
	mux.HandleFunc("POST /api/v1/subfinder/scan", handler.Scan)
}