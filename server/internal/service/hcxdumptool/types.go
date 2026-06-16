package hcxdumptool

import "time"

// PMKIDEntry represents a captured PMKID.
type PMKIDEntry struct {
	BSSID      string    `json:"bssid"`
	ESSID      string    `json:"essid"`
	PMKID      string    `json:"pmkid"`
	HashLine   string    `json:"hash_line"`    // Full hashcat format line
	CapturedAt time.Time `json:"captured_at"`
	File       string    `json:"file"`         // Path to .hc22000 file
}

// PMKIDCapture represents an active PMKID capture session.
type PMKIDCapture struct {
	ID         string    `json:"id"`
	Interface  string    `json:"interface"`
	Channel    int       `json:"channel"`
	Band       string    `json:"band"`
	StartTime  time.Time `json:"start_time"`
	Status     string    `json:"status"` // running, stopped, completed
	OutputFile string    `json:"output_file"`
	PMKIDs     []PMKIDEntry `json:"pmkids"`
}

// CaptureRequest represents the request to start PMKID capture.
type CaptureRequest struct {
	Interface string `json:"interface"`
	Channel   int    `json:"channel,omitempty"`   // 0 = hop all
	Band      string `json:"band,omitempty"`      // 2.4, 5, all (default: all)
	Timeout   int    `json:"timeout,omitempty"`   // Capture duration in seconds (0 = continuous)
}

// CaptureResponse represents the response for starting a capture.
type CaptureResponse struct {
	CaptureID string `json:"capture_id"`
}

// StopCaptureResponse represents stop response.
type StopCaptureResponse struct {
	Status     string        `json:"status"`
	PMKIDs     []PMKIDEntry  `json:"pmkids"`
	OutputFile string        `json:"output_file"`
}