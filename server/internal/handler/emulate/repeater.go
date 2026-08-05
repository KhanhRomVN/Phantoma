package emulate

import (
	"encoding/json"
	"net/http"
	"strings"

	domainemulate "github.com/phantoma/server/internal/domain/emulate"
	svcemulate "github.com/phantoma/server/internal/service/emulate"
	"github.com/phantoma/server/pkg/response"
)

// RepeaterHandler xử lý HTTP requests cho Repeater.
type RepeaterHandler struct {
	service *svcemulate.RepeaterService
}

// NewRepeaterHandler tạo Repeater handler mới.
func NewRepeaterHandler(svc *svcemulate.RepeaterService) *RepeaterHandler {
	return &RepeaterHandler{service: svc}
}

// =============================================================================
// Request handlers
// =============================================================================

// ListRequests handles GET /api/v1/emulate-targets/{targetId}/repeater/requests
func (h *RepeaterHandler) ListRequests(w http.ResponseWriter, r *http.Request) {
	targetID := extractRepeaterTargetID(r.URL.Path)
	if targetID == "" {
		response.Error(w, http.StatusBadRequest, "missing target id")
		return
	}
	requests, err := h.service.GetRequestsByTarget(targetID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	response.JSON(w, http.StatusOK, requests)
}

// GetRequest handles GET /api/v1/emulate-targets/{targetId}/repeater/requests/{requestId}
func (h *RepeaterHandler) GetRequest(w http.ResponseWriter, r *http.Request) {
	requestID := extractRepeaterRequestID(r.URL.Path)
	if requestID == "" {
		response.Error(w, http.StatusBadRequest, "missing request id")
		return
	}
	req, err := h.service.GetRequestByID(requestID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	if req == nil {
		response.Error(w, http.StatusNotFound, "request not found")
		return
	}
	response.JSON(w, http.StatusOK, req)
}

// CreateRequest handles POST /api/v1/emulate-targets/{targetId}/repeater/requests
func (h *RepeaterHandler) CreateRequest(w http.ResponseWriter, r *http.Request) {
	targetID := extractRepeaterTargetID(r.URL.Path)
	if targetID == "" {
		response.Error(w, http.StatusBadRequest, "missing target id")
		return
	}
	var input domainemulate.CreateRepeaterRequestInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body: "+err.Error())
		return
	}
	input.EmulateTargetID = targetID
	if input.Method == "" {
		input.Method = "GET"
	}
	if input.URL == "" {
		response.Error(w, http.StatusBadRequest, "url is required")
		return
	}
	req, err := h.service.CreateRequest(input)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	response.JSON(w, http.StatusCreated, req)
}

// UpdateRequest handles PUT /api/v1/emulate-targets/{targetId}/repeater/requests/{requestId}
func (h *RepeaterHandler) UpdateRequest(w http.ResponseWriter, r *http.Request) {
	requestID := extractRepeaterRequestID(r.URL.Path)
	if requestID == "" {
		response.Error(w, http.StatusBadRequest, "missing request id")
		return
	}
	var input domainemulate.UpdateRepeaterRequestInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body: "+err.Error())
		return
	}
	req, err := h.service.UpdateRequest(requestID, input)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	if req == nil {
		response.Error(w, http.StatusNotFound, "request not found")
		return
	}
	response.JSON(w, http.StatusOK, req)
}

// DeleteRequest handles DELETE /api/v1/emulate-targets/{targetId}/repeater/requests/{requestId}
func (h *RepeaterHandler) DeleteRequest(w http.ResponseWriter, r *http.Request) {
	requestID := extractRepeaterRequestID(r.URL.Path)
	if requestID == "" {
		response.Error(w, http.StatusBadRequest, "missing request id")
		return
	}
	deleted, err := h.service.DeleteRequest(requestID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	if !deleted {
		response.Error(w, http.StatusNotFound, "request not found")
		return
	}
	response.JSON(w, http.StatusOK, map[string]bool{"deleted": true})
}

// =============================================================================
// Payload handlers
// =============================================================================

// ListPayloads handles GET /api/v1/emulate-targets/{targetId}/repeater/requests/{requestId}/payloads
func (h *RepeaterHandler) ListPayloads(w http.ResponseWriter, r *http.Request) {
	requestID := extractRepeaterRequestID(r.URL.Path)
	if requestID == "" {
		response.Error(w, http.StatusBadRequest, "missing request id")
		return
	}
	payloads, err := h.service.GetPayloadsByRequest(requestID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	response.JSON(w, http.StatusOK, payloads)
}

// UpsertPayload handles PUT /api/v1/emulate-targets/{targetId}/repeater/requests/{requestId}/payloads
func (h *RepeaterHandler) UpsertPayload(w http.ResponseWriter, r *http.Request) {
	requestID := extractRepeaterRequestID(r.URL.Path)
	if requestID == "" {
		response.Error(w, http.StatusBadRequest, "missing request id")
		return
	}
	var input domainemulate.CreateRepeaterPayloadInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body: "+err.Error())
		return
	}
	if input.Name == "" {
		response.Error(w, http.StatusBadRequest, "name is required")
		return
	}
	payload, err := h.service.CreateOrUpdatePayload(requestID, input)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	response.JSON(w, http.StatusOK, payload)
}

// DeletePayload handles DELETE /api/v1/emulate-targets/{targetId}/repeater/requests/{requestId}/payloads/{payloadId}
func (h *RepeaterHandler) DeletePayload(w http.ResponseWriter, r *http.Request) {
	payloadID := extractLastPathSegment(r.URL.Path)
	if payloadID == "" {
		response.Error(w, http.StatusBadRequest, "missing payload id")
		return
	}
	deleted, err := h.service.DeletePayload(payloadID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	if !deleted {
		response.Error(w, http.StatusNotFound, "payload not found")
		return
	}
	response.JSON(w, http.StatusOK, map[string]bool{"deleted": true})
}

// =============================================================================
// History handlers
// =============================================================================

// ListHistoryByTarget handles GET /api/v1/emulate-targets/{targetId}/repeater/history
func (h *RepeaterHandler) ListHistoryByTarget(w http.ResponseWriter, r *http.Request) {
	targetID := extractRepeaterTargetID(r.URL.Path)
	if targetID == "" {
		response.Error(w, http.StatusBadRequest, "missing target id")
		return
	}
	history, err := h.service.GetHistoryByTarget(targetID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	response.JSON(w, http.StatusOK, history)
}

// ListHistoryByRequest handles GET /api/v1/emulate-targets/{targetId}/repeater/requests/{requestId}/history
func (h *RepeaterHandler) ListHistoryByRequest(w http.ResponseWriter, r *http.Request) {
	requestID := extractRepeaterRequestID(r.URL.Path)
	if requestID == "" {
		response.Error(w, http.StatusBadRequest, "missing request id")
		return
	}
	history, err := h.service.GetHistoryByRequest(requestID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	response.JSON(w, http.StatusOK, history)
}

// SaveHistory handles POST /api/v1/emulate-targets/{targetId}/repeater/requests/{requestId}/history
func (h *RepeaterHandler) SaveHistory(w http.ResponseWriter, r *http.Request) {
	requestID := extractRepeaterRequestID(r.URL.Path)
	if requestID == "" {
		response.Error(w, http.StatusBadRequest, "missing request id")
		return
	}
	var body struct {
		History domainemulate.CreateRepeaterHistoryInput       `json:"history"`
		Runs    []domainemulate.CreateRepeaterHistoryRunInput  `json:"runs"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body: "+err.Error())
		return
	}
	body.History.EmulateRepeaterRequestID = &requestID
	history, err := h.service.SaveHistory(body.History, body.Runs)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	response.JSON(w, http.StatusCreated, history)
}

// GetHistoryRuns handles GET /api/v1/emulate-targets/{targetId}/repeater/history/{historyId}/runs
func (h *RepeaterHandler) GetHistoryRuns(w http.ResponseWriter, r *http.Request) {
	historyID := extractRepeaterHistoryID(r.URL.Path)
	if historyID == "" {
		response.Error(w, http.StatusBadRequest, "missing history id")
		return
	}
	runs, err := h.service.GetRunsByHistory(historyID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	response.JSON(w, http.StatusOK, runs)
}

// DeleteHistory handles DELETE /api/v1/emulate-targets/{targetId}/repeater/history/{historyId}
func (h *RepeaterHandler) DeleteHistory(w http.ResponseWriter, r *http.Request) {
	historyID := extractRepeaterHistoryID(r.URL.Path)
	if historyID == "" {
		response.Error(w, http.StatusBadRequest, "missing history id")
		return
	}
	deleted, err := h.service.DeleteHistory(historyID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	if !deleted {
		response.Error(w, http.StatusNotFound, "history not found")
		return
	}
	response.JSON(w, http.StatusOK, map[string]bool{"deleted": true})
}

// =============================================================================
// Path extraction helpers
// =============================================================================

// extractRepeaterTargetID trích xuất target ID từ path:
//   /api/v1/emulate-targets/{targetId}/repeater/...
func extractRepeaterTargetID(path string) string {
	prefix := "/api/v1/emulate-targets/"
	trimmed := strings.TrimPrefix(path, prefix)
	parts := strings.SplitN(trimmed, "/", 3)
	if len(parts) >= 1 && parts[0] != "" {
		return parts[0]
	}
	return ""
}

// extractRepeaterRequestID trích xuất request ID từ path:
//   .../repeater/requests/{requestId}/...
func extractRepeaterRequestID(path string) string {
	// Find "/repeater/requests/" and take the next segment
	idx := strings.Index(path, "/repeater/requests/")
	if idx == -1 {
		return ""
	}
	rest := path[idx+len("/repeater/requests/"):]
	parts := strings.SplitN(rest, "/", 2)
	if len(parts) >= 1 && parts[0] != "" {
		return parts[0]
	}
	return ""
}

// extractRepeaterHistoryID trích xuất history ID từ path:
//   .../repeater/history/{historyId}/...
func extractRepeaterHistoryID(path string) string {
	idx := strings.Index(path, "/repeater/history/")
	if idx == -1 {
		return ""
	}
	rest := path[idx+len("/repeater/history/"):]
	parts := strings.SplitN(rest, "/", 2)
	if len(parts) >= 1 && parts[0] != "" {
		return parts[0]
	}
	return ""
}

// extractLastPathSegment trích xuất segment cuối cùng của path (dùng cho payload ID).
func extractLastPathSegment(path string) string {
	path = strings.TrimSuffix(path, "/")
	parts := strings.Split(path, "/")
	if len(parts) > 0 {
		return parts[len(parts)-1]
	}
	return ""
}