package domain

import "context"

// ScanRequest is the common input for any scanner tool.
type ScanRequest struct {
	Target string   `json:"target"`
	Flags  []string `json:"flags,omitempty"`
}

// ScanResult is the common output from any scanner tool.
type ScanResult struct {
	Success bool   `json:"success"`
	Output  string `json:"output"`
	Error   string `json:"error,omitempty"`
}

// Scanner defines the interface every scan tool must implement.
// Adding a new tool (e.g. gobuster, sqlmap) only requires implementing this interface.
type Scanner interface {
	Scan(ctx context.Context, req ScanRequest) (ScanResult, error)
}
