package tools

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/phantoma/server/internal/domain"
	amasssvc "github.com/phantoma/server/internal/service/amass"
)

type scanRequest struct {
	Target string   `json:"target"`
	Flags  []string `json:"flags"`
}

type scanResponse struct {
	Success    bool                   `json:"success"`
	Output     string                 `json:"output"`
	Error      string                 `json:"error,omitempty"`
	Data       map[string]interface{} `json:"data,omitempty"`
	Subdomains []string               `json:"subdomains,omitempty"`
}

// AmassHandler handles HTTP requests for amass scans.
type AmassHandler struct {
	svc *amasssvc.Service
}

func NewAmassHandler(svc *amasssvc.Service) *AmassHandler {
	return &AmassHandler{svc: svc}
}

// Scan handles POST /api/v1/amass/scan
func (h *AmassHandler) Scan(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req scanRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Target == "" {
		http.Error(w, "target is required", http.StatusBadRequest)
		return
	}

	result, err := h.svc.Scan(r.Context(), domain.ScanRequest{
		Target: req.Target,
		Flags:  req.Flags,
	})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	resp := scanResponse{
		Success: result.Success,
		Output:  result.Output,
		Error:   result.Error,
	}

	// Parse output for subdomains
	if result.Success && result.Output != "" {
		subdomains := parseAmassOutput(result.Output)
		resp.Subdomains = subdomains
		resp.Data = map[string]interface{}{
			"subdomains": subdomains,
			"count":      len(subdomains),
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(resp)
}

// ScanStream streams amass scan output via Server-Sent Events (SSE).
// GET /api/v1/amass/scan/stream?target=...&flags=-active,-brute
func (h *AmassHandler) ScanStream(w http.ResponseWriter, r *http.Request) {
	target := r.URL.Query().Get("target")
	if target == "" {
		http.Error(w, "target is required", http.StatusBadRequest)
		return
	}

	flagsStr := r.URL.Query().Get("flags")
	var flags []string
	if flagsStr != "" {
		flags = strings.Split(flagsStr, ",")
	}

	req := domain.ScanRequest{
		Target: target,
		Flags:  flags,
	}

	// Set SSE headers
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming not supported", http.StatusInternalServerError)
		return
	}

	lineCh, errCh := h.svc.ScanStream(r.Context(), req)

	// Send initial event
	fmt.Fprintf(w, "event: start\ndata: scan started for %s\n\n", target)
	flusher.Flush()

	for {
		select {
		case line, ok := <-lineCh:
			if !ok {
				fmt.Fprintf(w, "event: done\ndata: scan complete\n\n")
				flusher.Flush()
				return
			}
			safeLine := strings.ReplaceAll(line, "\n", "")
			safeLine = strings.ReplaceAll(safeLine, "\r", "")
			fmt.Fprintf(w, "data: %s\n\n", safeLine)
			flusher.Flush()

		case err := <-errCh:
			if err != nil {
				fmt.Fprintf(w, "event: error\ndata: %s\n\n", err.Error())
				flusher.Flush()
			}
			return

		case <-r.Context().Done():
			return
		}
	}
}

// parseAmassOutput extracts subdomains from amass stdout
func parseAmassOutput(output string) []string {
	var subdomains []string
	lines := splitLines(output)
	for _, line := range lines {
		if line == "" {
			continue
		}
		if idx := findSpace(line); idx > 0 {
			subdomains = append(subdomains, line[:idx])
		} else {
			subdomains = append(subdomains, line)
		}
	}
	return unique(subdomains)
}

func splitLines(s string) []string {
	var lines []string
	start := 0
	for i := 0; i < len(s); i++ {
		if s[i] == '\n' {
			lines = append(lines, s[start:i])
			start = i + 1
		}
	}
	if start < len(s) {
		lines = append(lines, s[start:])
	}
	return lines
}

func findSpace(s string) int {
	for i, c := range s {
		if c == ' ' {
			return i
		}
	}
	return -1
}

func unique(slice []string) []string {
	seen := make(map[string]bool)
	result := []string{}
	for _, s := range slice {
		if !seen[s] && s != "" {
			seen[s] = true
			result = append(result, s)
		}
	}
	return result
}