package emulate

// TargetFilter lưu filter setting cho một emulate target.
type TargetFilter struct {
	ID              string `json:"id"`
	EmulateTargetID string `json:"emulate_target_id"`
	Method          string `json:"method"`
	Host            string `json:"host"`
	Status          string `json:"status"`
	Type            string `json:"type"`
}

// CreateTargetFilterInput là input để tạo filter mới.
type CreateTargetFilterInput struct {
	EmulateTargetID string `json:"emulate_target_id"`
	Method          string `json:"method"`
	Host            string `json:"host"`
	Status          string `json:"status"`
	Type            string `json:"type"`
}

// UpdateTargetFilterInput là input để cập nhật filter.
type UpdateTargetFilterInput struct {
	Method *string `json:"method,omitempty"`
	Host   *string `json:"host,omitempty"`
	Status *string `json:"status,omitempty"`
	Type   *string `json:"type,omitempty"`
}