package nikto

import (
	"encoding/json"
	"net/http"

	"github.com/phantoma/server/internal/domain"
	"github.com/phantoma/server/pkg/logger"
	"github.com/phantoma/server/pkg/response"
)

var log = logger.WithContext("NiktoHandler")

// Handler handles HTTP requests for nikto scanning.
type Handler struct {
	scanner domain.Scanner
}

func NewHandler(scanner domain.Scanner) *Handler {
	return &Handler{scanner: scanner}
}

func (h *Handler) Scan(w http.ResponseWriter, r *http.Request) {
	var req domain.ScanRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Target == "" {
		response.Error(w, http.StatusBadRequest, "target is required")
		return
	}

	log.Info("Scan — starting", logger.F("target", req.Target), logger.F("flags", req.Flags))

	result, err := h.scanner.Scan(r.Context(), req)
	if err != nil {
		log.Error("Scan — failed", logger.F("target", req.Target), logger.F("error", err))
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	log.Info("Scan — complete", logger.F("target", req.Target), logger.F("success", result.Success))
	response.JSON(w, http.StatusOK, result)
}
