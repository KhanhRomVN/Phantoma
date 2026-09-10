package emulate

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/phantoma/server/internal/config"
	domainemulate "github.com/phantoma/server/internal/domain/emulate"
)

// ReportFileStorage handles reading/writing report markdown content to file system.
type ReportFileStorage struct{}

// NewReportFileStorage creates a new report file storage instance.
func NewReportFileStorage() *ReportFileStorage {
	return &ReportFileStorage{}
}

// getReportsDir returns the reports directory for a target.
// Format: ~/.phantoma/emulate:{targetId}/reports/
func (s *ReportFileStorage) getReportsDir(targetID string) string {
	appDataDir := config.GetAppDataDir()
	return filepath.Join(appDataDir, fmt.Sprintf("emulate:%s", targetID), "reports")
}

// getReportDir returns the directory path for a report.
// Format: ~/.phantoma/emulate:{targetId}/reports/report:{reportId}/
func (s *ReportFileStorage) getReportDir(targetID, reportID string) string {
	return filepath.Join(s.getReportsDir(targetID), fmt.Sprintf("report:%s", reportID))
}

// ensureDir creates directory if not exists.
func (s *ReportFileStorage) ensureDir(dir string) error {
	return os.MkdirAll(dir, 0700)
}

// WriteReport writes markdown content to {reportId}.md file.
func (s *ReportFileStorage) WriteReport(targetID, reportID, content string) error {
	dir := s.getReportDir(targetID, reportID)
	if err := s.ensureDir(dir); err != nil {
		return fmt.Errorf("create report directory: %w", err)
	}

	filePath := filepath.Join(dir, fmt.Sprintf("%s.md", reportID))
	if err := os.WriteFile(filePath, []byte(content), 0600); err != nil {
		return fmt.Errorf("write report file: %w", err)
	}
	return nil
}

// ReadReport reads markdown content from {reportId}.md file.
// Returns empty string if file does not exist.
func (s *ReportFileStorage) ReadReport(targetID, reportID string) (string, error) {
	filePath := filepath.Join(s.getReportDir(targetID, reportID), fmt.Sprintf("%s.md", reportID))
	data, err := os.ReadFile(filePath)
	if err != nil {
		if os.IsNotExist(err) {
			return "", os.ErrNotExist
		}
		return "", fmt.Errorf("read report file: %w", err)
	}
	return string(data), nil
}

// DeleteReport removes the entire report directory.
func (s *ReportFileStorage) DeleteReport(targetID, reportID string) error {
	dir := s.getReportDir(targetID, reportID)
	if err := os.RemoveAll(dir); err != nil {
		return fmt.Errorf("delete report directory: %w", err)
	}
	return nil
}

// ListReports scans the reports directory and returns all reports for a target.
// Each report folder is named "report:{reportId}" and contains "{reportId}.md".
func (s *ReportFileStorage) ListReports(targetID string) ([]domainemulate.Report, error) {
	reportsDir := s.getReportsDir(targetID)
	entries, err := os.ReadDir(reportsDir)
	if err != nil {
		if os.IsNotExist(err) {
			return []domainemulate.Report{}, nil
		}
		return nil, fmt.Errorf("read reports directory: %w", err)
	}

	var reports []domainemulate.Report
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		folderName := entry.Name()
		if !strings.HasPrefix(folderName, "report:") {
			continue
		}

		reportID := strings.TrimPrefix(folderName, "report:")
		content, err := s.ReadReport(targetID, reportID)
		if err != nil {
			// Folder không có file .md tương ứng (ví dụ folder rỗng hoặc tàn dư)
			// → bỏ qua thay vì làm hỏng toàn bộ danh sách.
			if os.IsNotExist(err) {
				continue
			}
			return nil, fmt.Errorf("read report %s: %w", reportID, err)
		}

		reports = append(reports, domainemulate.Report{
			ID:              reportID,
			EmulateTargetID: targetID,
			Title:           parseTitleFromMarkdown(content),
			Content:         content,
			FilePath:        filepath.Join(s.getReportDir(targetID, reportID), fmt.Sprintf("%s.md", reportID)),
			CreatedAt:       0,
			UpdatedAt:       0,
		})
	}

	return reports, nil
}

// parseTitleFromMarkdown extracts title from the first line of markdown content.
func parseTitleFromMarkdown(content string) string {
	firstLine := strings.Split(content, "\n")[0]
	firstLine = strings.TrimSpace(firstLine)
	firstLine = strings.TrimPrefix(firstLine, "# ")
	firstLine = strings.TrimLeft(firstLine, "#")
	firstLine = strings.TrimSpace(firstLine)
	if firstLine == "" {
		return "Untitled Report"
	}
	return firstLine
}