package tools

import (
	"encoding/json"
	"net/http"

	domaintools "github.com/phantoma/server/internal/domain/tools"
	godork "github.com/phantoma/server/internal/service/go-dork"
	"github.com/phantoma/server/pkg/response"
)

type DorkHandler struct {
	service *godork.Service
}

func NewDorkHandler(service *godork.Service) *DorkHandler {
	return &DorkHandler{service: service}
}

// Search handles dork search requests.
// POST /api/v1/dork/search
// Body: { "query": "...", "engine": "google", "pages": 3, "proxy": "...", "headers": [...] }
func (h *DorkHandler) Search(w http.ResponseWriter, r *http.Request) {
	var req domaintools.DorkQuery
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Query == "" {
		response.Error(w, http.StatusBadRequest, "query is required")
		return
	}

	// Set defaults
	if req.Engine == "" {
		req.Engine = domaintools.EngineGoogle
	}
	if req.Pages <= 0 {
		req.Pages = 1
	}

	result, err := h.service.Search(r.Context(), req)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	response.JSON(w, http.StatusOK, result)
}

// SearchByFile reads dorks from a file and executes them.
// POST /api/v1/dork/file
// Body: { "file": "path/to/dorks.txt", "engine": "google", "pages": 1 }
func (h *DorkHandler) SearchByFile(w http.ResponseWriter, r *http.Request) {
	var req struct {
		File   string              `json:"file"`
		Engine domaintools.SearchEngine `json:"engine,omitempty"`
		Pages  int                 `json:"pages,omitempty"`
		Proxy  string              `json:"proxy,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.File == "" {
		response.Error(w, http.StatusBadRequest, "file path is required")
		return
	}

	// This would need file reading logic - for now return not implemented
	response.Error(w, http.StatusNotImplemented, "file-based dorking not yet implemented")
}