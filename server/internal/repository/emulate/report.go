package emulate

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"

	domainemulate "github.com/phantoma/server/internal/domain/emulate"
)

// =============================================================================
// ReportRepository interface
// =============================================================================

// ReportRepository defines the interface for report data access (file-based).
type ReportRepository interface {
	GetReportsByTargetID(targetID string) ([]domainemulate.Report, error)
	GetReportByID(targetID, reportID string) (*domainemulate.Report, error)
	CreateReport(input domainemulate.CreateReportInput) (*domainemulate.Report, error)
	UpdateReport(targetID, reportID string, input domainemulate.UpdateReportInput) (*domainemulate.Report, error)
	DeleteReport(targetID, reportID string) (bool, error)
}

// =============================================================================
// FileReportRepository
// =============================================================================

// FileReportRepository implements ReportRepository using file system storage.
type FileReportRepository struct {
	fileStorage *ReportFileStorage
}

// NewReportRepository creates a new report repository instance.
func NewReportRepository() ReportRepository {
	return &FileReportRepository{
		fileStorage: NewReportFileStorage(),
	}
}

// generateUUID tạo UUID v4 đơn giản bằng crypto/rand.
func generateUUID() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	return hex.EncodeToString(b[:4]) + "-" + hex.EncodeToString(b[4:6]) + "-" +
		hex.EncodeToString(b[6:8]) + "-" + hex.EncodeToString(b[8:10]) + "-" +
		hex.EncodeToString(b[10:16])
}

// =============================================================================
// CRUD
// =============================================================================

// GetReportsByTargetID returns all reports for a target from file system.
func (r *FileReportRepository) GetReportsByTargetID(targetID string) ([]domainemulate.Report, error) {
	return r.fileStorage.ListReports(targetID)
}

// GetReportByID returns a report by target ID and report ID.
func (r *FileReportRepository) GetReportByID(targetID, reportID string) (*domainemulate.Report, error) {
	content, err := r.fileStorage.ReadReport(targetID, reportID)
	if err != nil {
		return nil, fmt.Errorf("read report: %w", err)
	}
	if content == "" {
		return nil, nil
	}

	return &domainemulate.Report{
		ID:              reportID,
		EmulateTargetID: targetID,
		Title:           parseTitleFromMarkdown(content),
		Content:         content,
		FilePath:        r.fileStorage.getReportDir(targetID, reportID) + "/" + reportID + ".md",
		CreatedAt:       0,
		UpdatedAt:       0,
	}, nil
}

// CreateReport writes a new report file and returns it.
func (r *FileReportRepository) CreateReport(input domainemulate.CreateReportInput) (*domainemulate.Report, error) {
	reportID := generateUUID()
	if err := r.fileStorage.WriteReport(input.EmulateTargetID, reportID, input.Content); err != nil {
		return nil, err
	}

	return &domainemulate.Report{
		ID:              reportID,
		EmulateTargetID: input.EmulateTargetID,
		Title:           parseTitleFromMarkdown(input.Content),
		Content:         input.Content,
		FilePath:        r.fileStorage.getReportDir(input.EmulateTargetID, reportID) + "/" + reportID + ".md",
		CreatedAt:       0,
		UpdatedAt:       0,
	}, nil
}

// UpdateReport rewrites the report file and returns the updated report.
func (r *FileReportRepository) UpdateReport(targetID, reportID string, input domainemulate.UpdateReportInput) (*domainemulate.Report, error) {
	if err := r.fileStorage.WriteReport(targetID, reportID, input.Content); err != nil {
		return nil, err
	}

	return r.GetReportByID(targetID, reportID)
}

// DeleteReport removes the report directory.
func (r *FileReportRepository) DeleteReport(targetID, reportID string) (bool, error) {
	existing, err := r.GetReportByID(targetID, reportID)
	if err != nil {
		return false, err
	}
	if existing == nil {
		return false, nil
	}

	if err := r.fileStorage.DeleteReport(targetID, reportID); err != nil {
		return false, fmt.Errorf("delete report: %w", err)
	}
	return true, nil
}