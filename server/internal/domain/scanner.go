package domain

import "context"

// ScanRequest is the common input for any scanner tool.
type ScanRequest struct {
	ScanID string   `json:"scanId,omitempty"` // Unique identifier for cancelation
	Target string   `json:"target"`
	Flags  []string `json:"flags,omitempty"`
}

// ScanResult is the common output from any scanner tool.
type ScanResult struct {
	ScanID  string `json:"scanId,omitempty"`
	Success bool   `json:"success"`
	Output  string `json:"output"`
	Error   string `json:"error,omitempty"`
}

// CancelScanRequest is used to cancel a running scan.
type CancelScanRequest struct {
	ScanID string `json:"scanId"`
}

// Scanner defines the interface every scan tool must implement.
// Adding a new tool (e.g. gobuster, sqlmap) only requires implementing this interface.
type Scanner interface {
	Scan(ctx context.Context, req ScanRequest) (ScanResult, error)
}
