package emulate

// =============================================================================
// Repeater Request
// =============================================================================

// RepeaterRequest đại diện cho một request configuration trong Repeater.
type RepeaterRequest struct {
	ID              string `json:"id"`
	EmulateTargetID string `json:"emulate_target_id"`
	Method          string `json:"method"`
	URL             string `json:"url"`
	Body            string `json:"body"`
	Params          string `json:"params"`  // JSON array of ParamItem
	Headers         string `json:"headers"` // JSON array of HeaderItem
	CreatedAt       int64  `json:"created_at"`
	UpdatedAt       int64  `json:"updated_at"`
}

// CreateRepeaterRequestInput là input để tạo repeater request mới.
type CreateRepeaterRequestInput struct {
	EmulateTargetID string `json:"emulate_target_id"`
	Method          string `json:"method"`
	URL             string `json:"url"`
	Body            string `json:"body,omitempty"`
	Params          string `json:"params,omitempty"`
	Headers         string `json:"headers,omitempty"`
}

// UpdateRepeaterRequestInput là input để cập nhật repeater request.
type UpdateRepeaterRequestInput struct {
	Method  *string `json:"method,omitempty"`
	URL     *string `json:"url,omitempty"`
	Body    *string `json:"body,omitempty"`
	Params  *string `json:"params,omitempty"`
	Headers *string `json:"headers,omitempty"`
}

// =============================================================================
// Repeater Payload
// =============================================================================

// RepeaterPayload đại diện cho một payload definition.
type RepeaterPayload struct {
	ID                       string `json:"id"`
	EmulateRepeaterRequestID string `json:"emulate_repeater_request_id"`
	Name                     string `json:"name"`
	PayloadValues            string `json:"payload_values"`
	Enabled                  int    `json:"enabled"`
	CreatedAt                int64  `json:"created_at"`
}

// CreateRepeaterPayloadInput là input để tạo payload mới.
type CreateRepeaterPayloadInput struct {
	EmulateRepeaterRequestID string `json:"emulate_repeater_request_id"`
	Name                     string `json:"name"`
	PayloadValues            string `json:"payload_values,omitempty"`
	Enabled                  *int   `json:"enabled,omitempty"`
}

// UpdateRepeaterPayloadInput là input để cập nhật payload.
type UpdateRepeaterPayloadInput struct {
	PayloadValues *string `json:"payload_values,omitempty"`
	Enabled       *int    `json:"enabled,omitempty"`
}

// =============================================================================
// Repeater History
// =============================================================================

// RepeaterHistory đại diện cho một lần chạy lịch sử.
type RepeaterHistory struct {
	ID                       string  `json:"id"`
	EmulateRepeaterRequestID *string `json:"emulate_repeater_request_id"`
	Method                   string  `json:"method"`
	URL                      string  `json:"url"`
	Status                   *int    `json:"status"`
	Statuses                 string  `json:"statuses"` // JSON object
	Timestamp                int64   `json:"timestamp"`
	EndTime                  *int64  `json:"end_time"`
	Duration                 int     `json:"duration"`
	PayloadCount             int     `json:"payload_count"`
	PayloadSummary           string  `json:"payload_summary"`
	RequestHeaders           string  `json:"request_headers"` // JSON object
	RequestBody              string  `json:"request_body"`
	CreatedAt                int64   `json:"created_at"`
}

// CreateRepeaterHistoryInput là input để tạo history entry.
type CreateRepeaterHistoryInput struct {
	EmulateRepeaterRequestID *string `json:"emulate_repeater_request_id,omitempty"`
	Method                   string  `json:"method"`
	URL                      string  `json:"url"`
	Status                   *int    `json:"status,omitempty"`
	Statuses                 string  `json:"statuses,omitempty"`
	Timestamp                int64   `json:"timestamp"`
	EndTime                  *int64  `json:"end_time,omitempty"`
	Duration                 int     `json:"duration,omitempty"`
	PayloadCount             int     `json:"payload_count,omitempty"`
	PayloadSummary           string  `json:"payload_summary,omitempty"`
	RequestHeaders           string  `json:"request_headers,omitempty"`
	RequestBody              string  `json:"request_body,omitempty"`
}

// =============================================================================
// Repeater History Run
// =============================================================================

// RepeaterHistoryRun đại diện cho kết quả của một payload run.
type RepeaterHistoryRun struct {
	ID              string `json:"id"`
	HistoryID       string `json:"history_id"`
	PayloadName     string `json:"payload_name"`
	PayloadValue    string `json:"payload_value"`
	Status          *int   `json:"status"`
	Duration        *int   `json:"duration"`
	Method          string `json:"method"`
	URL             string `json:"url"`
	Params          string `json:"params"`          // JSON object
	RequestHeaders  string `json:"request_headers"` // JSON object
	RequestBody     string `json:"request_body"`
	ResponseHeaders string `json:"response_headers"` // JSON object
	ResponseBody    string `json:"response_body"`
	CreatedAt       int64  `json:"created_at"`
}

// CreateRepeaterHistoryRunInput là input để tạo history run.
type CreateRepeaterHistoryRunInput struct {
	HistoryID       string `json:"history_id"`
	PayloadName     string `json:"payload_name"`
	PayloadValue    string `json:"payload_value"`
	Status          *int   `json:"status,omitempty"`
	Duration        *int   `json:"duration,omitempty"`
	Method          string `json:"method,omitempty"`
	URL             string `json:"url,omitempty"`
	Params          string `json:"params,omitempty"`
	RequestHeaders  string `json:"request_headers,omitempty"`
	RequestBody     string `json:"request_body,omitempty"`
	ResponseHeaders string `json:"response_headers,omitempty"`
	ResponseBody    string `json:"response_body,omitempty"`
}