package emulate

import (
	domainemulate "github.com/phantoma/server/internal/domain/emulate"
	repoemulate "github.com/phantoma/server/internal/repository/emulate"
)

// ReportService xử lý business logic cho Report.
type ReportService struct {
	repo repoemulate.ReportRepository
}

// NewReportService tạo Report service mới.
func NewReportService(repo repoemulate.ReportRepository) *ReportService {
	return &ReportService{repo: repo}
}

// GetReportsByTarget trả về tất cả reports cho một target.
func (s *ReportService) GetReportsByTarget(targetID string) ([]domainemulate.Report, error) {
	return s.repo.GetReportsByTargetID(targetID)
}

// GetReportByID trả về report theo target ID và report ID.
func (s *ReportService) GetReportByID(targetID, id string) (*domainemulate.Report, error) {
	return s.repo.GetReportByID(targetID, id)
}

// CreateReport tạo report mới.
func (s *ReportService) CreateReport(input domainemulate.CreateReportInput) (*domainemulate.Report, error) {
	return s.repo.CreateReport(input)
}

// UpdateReport cập nhật report.
func (s *ReportService) UpdateReport(targetID, id string, input domainemulate.UpdateReportInput) (*domainemulate.Report, error) {
	return s.repo.UpdateReport(targetID, id, input)
}

// DeleteReport xóa report.
func (s *ReportService) DeleteReport(targetID, id string) (bool, error) {
	return s.repo.DeleteReport(targetID, id)
}