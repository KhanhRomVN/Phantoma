package reaver

import "time"

// ReaverAttack represents an active WPS brute force attack.
type ReaverAttack struct {
	ID          string    `json:"id"`
	Interface   string    `json:"interface"`
	BSSID       string    `json:"bssid"`
	ESSID       string    `json:"essid,omitempty"`
	Channel     int       `json:"channel"`
	StartTime   time.Time `json:"start_time"`
	Status      string    `json:"status"` // running, stopped, completed, failed
	PINAttempts int       `json:"pin_attempts"`
	PINFound    string    `json:"pin_found,omitempty"`
	WPAKey      string    `json:"wpa_key,omitempty"`
	Progress    float64   `json:"progress"` // 0-100
}

// ReaverRequest represents the request to start a reaver attack.
type ReaverRequest struct {
	Interface   string `json:"interface"`
	BSSID       string `json:"bssid"`
	ESSID       string `json:"essid,omitempty"`
	Channel     int    `json:"channel"`
	Delay       int    `json:"delay,omitempty"`        // Delay between PIN attempts (default: 1)
	Timeout     int    `json:"timeout,omitempty"`      // Timeout in seconds
	NoNacks     bool   `json:"no_nacks,omitempty"`     // Ignore NACK messages
	Recurring   bool   `json:"recurring,omitempty"`    // Recurring delay
	Pin         string `json:"pin,omitempty"`          // Start from specific PIN
	UseBully    bool   `json:"use_bully,omitempty"`    // Use bully instead of reaver
}

// ReaverResponse represents the response for starting an attack.
type ReaverResponse struct {
	AttackID string `json:"attack_id"`
}

// ReaverProgress represents real-time progress update.
type ReaverProgress struct {
	AttackID    string  `json:"attack_id"`
	PINAttempts int     `json:"pin_attempts"`
	Progress    float64 `json:"progress"`
	PINFound    string  `json:"pin_found,omitempty"`
	WPAKey      string  `json:"wpa_key,omitempty"`
	Status      string  `json:"status"`
	Timestamp   time.Time `json:"timestamp"`
}