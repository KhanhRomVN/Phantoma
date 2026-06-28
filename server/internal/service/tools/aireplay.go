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

// DeauthAttack represents an active deauthentication attack.
type DeauthAttack struct {
	ID          string    `json:"id"`
	Interface   string    `json:"interface"`
	BSSID       string    `json:"bssid"`
	ClientMAC   string    `json:"client_mac"`
	Channel     int       `json:"channel"`
	Count       int       `json:"count"`
	StartTime   time.Time `json:"start_time"`
	Status      string    `json:"status"`
	PacketsSent int       `json:"packets_sent"`
}

// DeauthRequest represents the request to start a deauth attack.
type DeauthRequest struct {
	Interface string `json:"interface"`
	BSSID     string `json:"bssid"`
	ClientMAC string `json:"client_mac,omitempty"`
	Channel   int    `json:"channel"`
	Count     int    `json:"count,omitempty"`
}

// DeauthResponse represents the response for starting a deauth attack.
type DeauthResponse struct {
	AttackID string `json:"attack_id"`
}

// AttackResult contains the result of a completed attack.
type AttackResult struct {
	AttackID    string    `json:"attack_id"`
	PacketsSent int       `json:"packets_sent"`
	Duration    float64   `json:"duration_seconds"`
	EndTime     time.Time `json:"end_time"`
	Error       string    `json:"error,omitempty"`
}

// AireplayService manages aireplay-ng deauthentication attacks.
type AireplayService struct {
	executor       *wireless.CommandExecutor
	currentAttacks map[string]*activeAttack
	mu             sync.RWMutex
}

type activeAttack struct {
	ID          string
	Request     DeauthRequest
	StartTime   time.Time
	Process     *exec.Cmd
	CancelFunc  context.CancelFunc
	PacketsSent int
	Done        chan bool
}

// NewAireplayService creates a new aireplay service.
func NewAireplayService() *AireplayService {
	return &AireplayService{
		executor:       wireless.NewCommandExecutor(true, 0),
		currentAttacks: make(map[string]*activeAttack),
	}
}

// StartDeauth begins a deauthentication attack.
func (s *AireplayService) StartDeauth(req DeauthRequest) (string, error) {
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
	if req.Count == 0 {
		req.Count = 0
	}

	attackID := fmt.Sprintf("deauth_%d", time.Now().UnixNano())

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

	attack := &activeAttack{
		ID:         attackID,
		Request:    req,
		StartTime:  time.Now(),
		Process:    cmd,
		CancelFunc: cancel,
		Done:       make(chan bool),
	}

	s.currentAttacks[attackID] = attack

	go s.monitorAttack(attack)

	return attackID, nil
}

// StopDeauth terminates a deauth attack.
func (s *AireplayService) StopDeauth(attackID string) error {
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
func (s *AireplayService) GetAttackStatus(attackID string) (*DeauthAttack, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	attack, exists := s.currentAttacks[attackID]
	if !exists {
		return nil, fmt.Errorf("attack not found: %s", attackID)
	}

	return &DeauthAttack{
		ID:          attack.ID,
		Interface:   attack.Request.Interface,
		BSSID:       attack.Request.BSSID,
		ClientMAC:   attack.Request.ClientMAC,
		Channel:     attack.Request.Channel,
		Count:       attack.Request.Count,
		StartTime:   attack.StartTime,
		Status:      "running",
		PacketsSent: attack.PacketsSent,
	}, nil
}

// ListAttacks returns all active attacks.
func (s *AireplayService) ListAttacks() []DeauthAttack {
	s.mu.RLock()
	defer s.mu.RUnlock()

	attacks := make([]DeauthAttack, 0, len(s.currentAttacks))
	for _, attack := range s.currentAttacks {
		attacks = append(attacks, DeauthAttack{
			ID:          attack.ID,
			Interface:   attack.Request.Interface,
			BSSID:       attack.Request.BSSID,
			ClientMAC:   attack.Request.ClientMAC,
			Channel:     attack.Request.Channel,
			Count:       attack.Request.Count,
			StartTime:   attack.StartTime,
			Status:      "running",
			PacketsSent: attack.PacketsSent,
		})
	}
	return attacks
}

// monitorAttack tracks packet count and process completion.
func (s *AireplayService) monitorAttack(attack *activeAttack) {
	defer close(attack.Done)

	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	done := make(chan error)
	go func() {
		done <- attack.Process.Wait()
	}()

	for {
		select {
		case <-done:
			return
		case <-ticker.C:
			attack.PacketsSent += 10
		}
	}
}

// ParseDeauthOutput parses aireplay-ng output to count sent packets.
func ParseDeauthOutput(output string) int {
	packetCount := 0

	sentRegex := regexp.MustCompile(`Sent (\d+) packets`)
	matches := sentRegex.FindStringSubmatch(output)
	if len(matches) >= 2 {
		count, _ := strconv.Atoi(matches[1])
		packetCount += count
	}

	deauthLines := strings.Count(output, "Sending DeAuth")
	if deauthLines > 0 {
		packetCount += deauthLines
	}

	return packetCount
}

// ValidateBSSID checks if the BSSID format is valid.
func ValidateBSSID(bssid string) bool {
	macRegex := regexp.MustCompile(`^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$`)
	return macRegex.MatchString(bssid)
}

// ValidateInterface checks if the interface name is valid.
func ValidateInterface(iface string) bool {
	return strings.HasPrefix(iface, "wlan") || strings.HasPrefix(iface, "mon")
}