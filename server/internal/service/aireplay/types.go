package aireplay

import "time"

// DeauthAttack represents an active deauthentication attack.
type DeauthAttack struct {
	ID         string    `json:"id"`
	Interface  string    `json:"interface"`
	BSSID      string    `json:"bssid"`      // Target AP MAC
	ClientMAC  string    `json:"client_mac"` // Specific client (empty = broadcast)
	Channel    int       `json:"channel"`
	Count      int       `json:"count"` // Number of deauth packets (-1 = infinite)
	StartTime  time.Time `json:"start_time"`
	Status     string    `json:"status"` // running, stopped, completed
	PacketsSent int      `json:"packets_sent"`
}

// DeauthRequest represents the request to start a deauth attack.
type DeauthRequest struct {
	Interface string `json:"interface"`
	BSSID     string `json:"bssid"`
	ClientMAC string `json:"client_mac,omitempty"` // Optional, empty = broadcast deauth
	Channel   int    `json:"channel"`
	Count     int    `json:"count,omitempty"` // Default: 0 (continuous until stopped)
}

// DeauthResponse represents the response for starting a deauth attack.
type DeauthResponse struct {
	AttackID string `json:"attack_id"`
}

// AttackResult contains the result of a completed attack.
type AttackResult struct {
	AttackID     string    `json:"attack_id"`
	PacketsSent  int       `json:"packets_sent"`
	Duration     float64   `json:"duration_seconds"`
	EndTime      time.Time `json:"end_time"`
	Error        string    `json:"error,omitempty"`
}