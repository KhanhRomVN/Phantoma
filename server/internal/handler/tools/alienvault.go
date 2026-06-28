package tools

import (
	"encoding/json"
	"net/http"

	servicetools "github.com/phantoma/server/internal/service/tools"
)

// AlienvaultHandler handles HTTP requests for AlienVault OTX lookups.
type AlienvaultHandler struct {
	service *servicetools.AlienvaultService
}

// NewAlienvaultHandler creates a new AlienVault handler.
func NewAlienvaultHandler(svc *servicetools.AlienvaultService) *AlienvaultHandler {
	return &AlienvaultHandler{service: svc}
}

// Scan handles POST /api/v1/servicetools.scan
func (h *AlienvaultHandler) Scan(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req servicetools.ScanRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Validate request
	if req.Indicator == "" {
		http.Error(w, "indicator is required", http.StatusBadRequest)
		return
	}
	if req.IndicatorType == "" {
		http.Error(w, "indicatorType is required", http.StatusBadRequest)
		return
	}
	if req.APIKey == "" {
		http.Error(w, "apiKey is required", http.StatusBadRequest)
		return
	}

	// Perform lookup
	result, err := h.service.Lookup(r.Context(), req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Format raw output
	rawOutput := servicetools.FormatRawOutput(result, nil)

	// Prepare response
	response := map[string]interface{}{
		"success":   true,
		"data":      result,
		"rawOutput": rawOutput,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}