package tools

import (
	"encoding/json"
	"net/http"

	"github.com/phantoma/server/internal/service/hashcat"
	"github.com/phantoma/server/pkg/response"
)

// HashcatHandler handles HTTP requests for hashcat cracking.
type HashcatHandler struct {
	service *hashcat.Service
}

// NewHashcatHandler creates a new hashcat handler.
func NewHashcatHandler(svc *hashcat.Service) *HashcatHandler {
	return &HashcatHandler{service: svc}
}

// StartCrack handles POST /api/v1/wireless/crack/start
func (h *HashcatHandler) StartCrack(w http.ResponseWriter, r *http.Request) {
	var req hashcat.CrackRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.HashFile == "" {
		response.Error(w, http.StatusBadRequest, "hash_file is required")
		return
	}
	if req.Wordlist == "" && req.Mask == "" {
		response.Error(w, http.StatusBadRequest, "wordlist or mask is required")
		return
	}

	jobID, err := h.service.StartCrack(req)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	response.JSON(w, http.StatusOK, hashcat.CrackResponse{JobID: jobID})
}

// StopCrack handles POST /api/v1/wireless/crack/stop
func (h *HashcatHandler) StopCrack(w http.ResponseWriter, r *http.Request) {
	jobID := r.URL.Query().Get("id")
	if jobID == "" {
		response.Error(w, http.StatusBadRequest, "job id is required")
		return
	}

	result, err := h.service.StopCrack(jobID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	response.JSON(w, http.StatusOK, result)
}

// GetJobStatus handles GET /api/v1/wireless/crack/status
func (h *HashcatHandler) GetJobStatus(w http.ResponseWriter, r *http.Request) {
	jobID := r.URL.Query().Get("id")
	if jobID == "" {
		response.Error(w, http.StatusBadRequest, "job id is required")
		return
	}

	job, err := h.service.GetJobStatus(jobID)
	if err != nil {
		response.Error(w, http.StatusNotFound, err.Error())
		return
	}

	response.JSON(w, http.StatusOK, job)
}

// ListJobs handles GET /api/v1/wireless/crack/list
func (h *HashcatHandler) ListJobs(w http.ResponseWriter, r *http.Request) {
	jobs := h.service.ListJobs()
	response.JSON(w, http.StatusOK, jobs)
}