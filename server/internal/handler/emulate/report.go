package emulate

import (
	"encoding/json"
	"net/http"
	"strings"

	domainemulate "github.com/phantoma/server/internal/domain/emulate"
	svcemulate "github.com/phantoma/server/internal/service/emulate"
	"github.com/phantoma/server/pkg/response"
)

// ReportHandler xử lý HTTP requests cho Report.
type ReportHandler struct {
	service *svcemulate.ReportService
}

// NewReportHandler tạo Report handler mới.
func NewReportHandler(svc *svcemulate.ReportService) *ReportHandler {
	return &ReportHandler{service: svc}
}

// extractReportTargetID trích xuất targetId từ path dạng
// /api/v1/emulate-targets/{targetId}/reports/...
func extractReportTargetID(path string) string {
	const prefix = "/api/v1/emulate-targets/"
	rest := strings.TrimPrefix(path, prefix)
	parts := strings.Split(rest, "/")
	if len(parts) >= 1 && parts[0] != "" {
		return parts[0]
	}
	return ""
}

// extractReportID trích xuất reportId từ path dạng
// /api/v1/emulate-targets/{targetId}/reports/{reportId}
func extractReportID(path string) string {
	parts := strings.Split(path, "/")
	// Tìm phần tử sau "reports"
	for i, part := range parts {
		if part == "reports" && i+1 < len(parts) {
			return parts[i+1]
		}
	}
	return ""
}

// =============================================================================
// Handlers
// =============================================================================

// ListReports handles GET /api/v1/emulate-targets/{targetId}/reports
func (h *ReportHandler) ListReports(w http.ResponseWriter, r *http.Request) {
	targetID := extractReportTargetID(r.URL.Path)
	if targetID == "" {
		response.Error(w, http.StatusBadRequest, "missing target id")
		return
	}
	reports, err := h.service.GetReportsByTarget(targetID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	response.JSON(w, http.StatusOK, reports)
}

// GetReport handles GET /api/v1/emulate-targets/{targetId}/reports/{reportId}
func (h *ReportHandler) GetReport(w http.ResponseWriter, r *http.Request) {
	targetID := extractReportTargetID(r.URL.Path)
	if targetID == "" {
		response.Error(w, http.StatusBadRequest, "missing target id")
		return
	}
	reportID := extractReportID(r.URL.Path)
	if reportID == "" {
		response.Error(w, http.StatusBadRequest, "missing report id")
		return
	}
	report, err := h.service.GetReportByID(targetID, reportID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	if report == nil {
		response.Error(w, http.StatusNotFound, "report not found")
		return
	}
	response.JSON(w, http.StatusOK, report)
}

// CreateReport handles POST /api/v1/emulate-targets/{targetId}/reports
func (h *ReportHandler) CreateReport(w http.ResponseWriter, r *http.Request) {
	targetID := extractReportTargetID(r.URL.Path)
	if targetID == "" {
		response.Error(w, http.StatusBadRequest, "missing target id")
		return
	}
	var input domainemulate.CreateReportInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body: "+err.Error())
		return
	}
	input.EmulateTargetID = targetID
	if input.Content == "" {
		response.Error(w, http.StatusBadRequest, "content is required")
		return
	}
	report, err := h.service.CreateReport(input)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	response.JSON(w, http.StatusCreated, report)
}

// UpdateReport handles PUT /api/v1/emulate-targets/{targetId}/reports/{reportId}
func (h *ReportHandler) UpdateReport(w http.ResponseWriter, r *http.Request) {
	targetID := extractReportTargetID(r.URL.Path)
	if targetID == "" {
		response.Error(w, http.StatusBadRequest, "missing target id")
		return
	}
	reportID := extractReportID(r.URL.Path)
	if reportID == "" {
		response.Error(w, http.StatusBadRequest, "missing report id")
		return
	}
	var input domainemulate.UpdateReportInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body: "+err.Error())
		return
	}
	report, err := h.service.UpdateReport(targetID, reportID, input)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	if report == nil {
		response.Error(w, http.StatusNotFound, "report not found")
		return
	}
	response.JSON(w, http.StatusOK, report)
}

// DeleteReport handles DELETE /api/v1/emulate-targets/{targetId}/reports/{reportId}
func (h *ReportHandler) DeleteReport(w http.ResponseWriter, r *http.Request) {
	targetID := extractReportTargetID(r.URL.Path)
	if targetID == "" {
		response.Error(w, http.StatusBadRequest, "missing target id")
		return
	}
	reportID := extractReportID(r.URL.Path)
	if reportID == "" {
		response.Error(w, http.StatusBadRequest, "missing report id")
		return
	}
	deleted, err := h.service.DeleteReport(targetID, reportID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	if !deleted {
		response.Error(w, http.StatusNotFound, "report not found")
		return
	}
	response.JSON(w, http.StatusOK, map[string]bool{"deleted": true})
}