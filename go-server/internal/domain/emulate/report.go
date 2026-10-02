package emulate

// =============================================================================
// Report
// =============================================================================

// Report đại diện cho một markdown report trong Emulate module.
type Report struct {
	ID              string `json:"id"`
	EmulateTargetID string `json:"emulate_target_id"`
	Title           string `json:"title"`
	Content         string `json:"content"`
	FilePath        string `json:"file_path"`
	CreatedAt       int64  `json:"created_at"`
	UpdatedAt       int64  `json:"updated_at"`
}

// CreateReportInput là input để tạo report mới.
type CreateReportInput struct {
	EmulateTargetID string `json:"emulate_target_id"`
	Title           string `json:"title"`
	Content         string `json:"content"`
	FilePath        string `json:"file_path"`
}

// UpdateReportInput là input để cập nhật report.
type UpdateReportInput struct {
	Title    string `json:"title"`
	Content  string `json:"content"`
	FilePath string `json:"file_path"`
}