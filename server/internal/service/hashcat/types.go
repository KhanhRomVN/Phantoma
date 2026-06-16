package hashcat

import "time"

// HashType represents the hash format supported by hashcat.
type HashType int

const (
	HashTypeWPA HashType = 2500  // WPA/WPA2 (handshake)
	HashTypeWPA2 HashType = 2500 // Same as WPA
	HashTypeWPA3 HashType = 16800 // WPA3
	HashTypePMKID HashType = 22000 // PMKID (hc22000 format)
)

// AttackMode represents hashcat attack modes.
type AttackMode int

const (
	AttackModeStraight AttackMode = 0  // wordlist
	AttackModeCombination AttackMode = 1 // wordlist + wordlist
	AttackModeMask AttackMode = 3  // mask attack (brute force)
	AttackModeHybridWordMask AttackMode = 6 // wordlist + mask
	AttackModeHybridMaskWord AttackMode = 7 // mask + wordlist
)

// CrackJob represents a password cracking task.
type CrackJob struct {
	ID          string    `json:"id"`
	HashFile    string    `json:"hash_file"`
	Wordlist    string    `json:"wordlist,omitempty"`
	HashType    HashType  `json:"hash_type"`
	AttackMode  AttackMode `json:"attack_mode"`
	Mask        string    `json:"mask,omitempty"`
	Status      string    `json:"status"` // queued, running, completed, failed, stopped
	Progress    float64   `json:"progress"` // 0-100
	Speed       int64     `json:"speed"` // hashes per second
	Recovered   int       `json:"recovered"`
	TotalHashes int       `json:"total_hashes"`
	CrackedPasswords map[string]string `json:"cracked_passwords"`
	StartTime   time.Time `json:"start_time"`
	EndTime     *time.Time `json:"end_time,omitempty"`
	OutputFile  string    `json:"output_file,omitempty"`
}

// CrackRequest represents the request to start a cracking job.
type CrackRequest struct {
	HashFile   string    `json:"hash_file"`   // Path to .hc22000 or .cap file
	Wordlist   string    `json:"wordlist"`    // Path to wordlist file
	HashType   HashType  `json:"hash_type"`   // 2500 for WPA, 22000 for PMKID
	AttackMode AttackMode `json:"attack_mode"` // 0 for wordlist
	Mask       string    `json:"mask,omitempty"` // For mask attack
	Rules      string    `json:"rules,omitempty"` // Rules file
	GPUIDs     []int     `json:"gpu_ids,omitempty"` // GPU devices to use
	Threads    int       `json:"threads,omitempty"` // CPU threads
}

// CrackResponse represents the response for starting a crack job.
type CrackResponse struct {
	JobID string `json:"job_id"`
}

// ProgressUpdate represents real-time progress.
type ProgressUpdate struct {
	JobID      string  `json:"job_id"`
	Progress   float64 `json:"progress"`
	Speed      int64   `json:"speed"`
	Recovered  int     `json:"recovered"`
	Status     string  `json:"status"`
	Timestamp  time.Time `json:"timestamp"`
}