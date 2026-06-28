package tools

import (
	"bufio"
	"context"
	"fmt"
	"os"
	"os/exec"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/phantoma/server/internal/service/wireless"
)

// PMKIDEntry represents a captured PMKID.
type PMKIDEntry struct {
	BSSID      string    `json:"bssid"`
	ESSID      string    `json:"essid"`
	PMKID      string    `json:"pmkid"`
	HashLine   string    `json:"hash_line"`
	CapturedAt time.Time `json:"captured_at"`
	File       string    `json:"file"`
}

// PMKIDCapture represents an active PMKID capture session.
type PMKIDCapture struct {
	ID         string        `json:"id"`
	Interface  string        `json:"interface"`
	Channel    int           `json:"channel"`
	Band       string        `json:"band"`
	StartTime  time.Time     `json:"start_time"`
	Status     string        `json:"status"`
	OutputFile string        `json:"output_file"`
	PMKIDs     []PMKIDEntry  `json:"pmkids"`
}

// CaptureRequest represents the request to start PMKID capture.
type CaptureRequest struct {
	Interface string `json:"interface"`
	Channel   int    `json:"channel,omitempty"`
	Band      string `json:"band,omitempty"`
	Timeout   int    `json:"timeout,omitempty"`
}

// CaptureResponse represents the response for starting a capture.
type CaptureResponse struct {
	CaptureID string `json:"capture_id"`
}

// StopCaptureResponse represents stop response.
type StopCaptureResponse struct {
	Status     string       `json:"status"`
	PMKIDs     []PMKIDEntry `json:"pmkids"`
	OutputFile string       `json:"output_file"`
}

// HcxdumptoolService manages hcxdumptool PMKID capture operations.
type HcxdumptoolService struct {
	executor        *wireless.CommandExecutor
	currentCaptures map[string]*activeCapture
	mu              sync.RWMutex
}

type activeCapture struct {
	ID         string
	Request    CaptureRequest
	StartTime  time.Time
	Process    *exec.Cmd
	CancelFunc context.CancelFunc
	OutputFile string
	PMKIDs     []PMKIDEntry
	Done       chan bool
}

// NewHcxdumptoolService creates a new hcxdumptool service.
func NewHcxdumptoolService() *HcxdumptoolService {
	return &HcxdumptoolService{
		executor:        wireless.NewCommandExecutor(true, 0),
		currentCaptures: make(map[string]*activeCapture),
	}
}

// StartCapture begins PMKID capture on the specified interface.
func (s *HcxdumptoolService) StartCapture(req CaptureRequest) (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if req.Interface == "" {
		return "", fmt.Errorf("interface is required")
	}

	captureID := fmt.Sprintf("pmkid_%d", time.Now().UnixNano())
	tempDir := fmt.Sprintf("/tmp/hcxdumptool_%s", captureID)
	if err := os.MkdirAll(tempDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create temp dir: %w", err)
	}

	outputFile := fmt.Sprintf("%s/capture", tempDir)
	finalFile := outputFile + ".hc22000"

	args := []string{
		"hcxdumptool",
		"-i", req.Interface,
		"-o", outputFile,
		"--enable_status=1",
	}

	if req.Channel > 0 {
		args = append(args, "-c", fmt.Sprintf("%d", req.Channel))
	}
	if req.Band != "" && req.Band != "all" {
		args = append(args, "-b", req.Band)
	}
	if req.Timeout > 0 {
		args = append(args, "-t", fmt.Sprintf("%d", req.Timeout))
	}

	ctx, cancel := context.WithCancel(context.Background())
	cmd := exec.CommandContext(ctx, "sudo", args...)

	if err := cmd.Start(); err != nil {
		cancel()
		return "", fmt.Errorf("failed to start hcxdumptool: %w", err)
	}

	capture := &activeCapture{
		ID:         captureID,
		Request:    req,
		StartTime:  time.Now(),
		Process:    cmd,
		CancelFunc: cancel,
		OutputFile: finalFile,
		Done:       make(chan bool),
	}

	s.currentCaptures[captureID] = capture

	go s.monitorCapture(capture)

	return captureID, nil
}

// StopCapture terminates the PMKID capture.
func (s *HcxdumptoolService) StopCapture(captureID string) (*StopCaptureResponse, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	capture, exists := s.currentCaptures[captureID]
	if !exists {
		return nil, fmt.Errorf("capture not found: %s", captureID)
	}

	capture.CancelFunc()
	<-capture.Done

	pmkids, err := ParseHc22000(capture.OutputFile)
	if err != nil {
		pmkids = capture.PMKIDs
	}

	delete(s.currentCaptures, captureID)

	return &StopCaptureResponse{
		Status:     "stopped",
		PMKIDs:     pmkids,
		OutputFile: capture.OutputFile,
	}, nil
}

// GetCaptureStatus returns the status of a capture.
func (s *HcxdumptoolService) GetCaptureStatus(captureID string) (*PMKIDCapture, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	capture, exists := s.currentCaptures[captureID]
	if !exists {
		return nil, fmt.Errorf("capture not found: %s", captureID)
	}

	return &PMKIDCapture{
		ID:         capture.ID,
		Interface:  capture.Request.Interface,
		Channel:    capture.Request.Channel,
		Band:       capture.Request.Band,
		StartTime:  capture.StartTime,
		Status:     "running",
		OutputFile: capture.OutputFile,
		PMKIDs:     capture.PMKIDs,
	}, nil
}

// ListCaptures returns all active captures.
func (s *HcxdumptoolService) ListCaptures() []PMKIDCapture {
	s.mu.RLock()
	defer s.mu.RUnlock()

	captures := make([]PMKIDCapture, 0, len(s.currentCaptures))
	for _, capture := range s.currentCaptures {
		captures = append(captures, PMKIDCapture{
			ID:         capture.ID,
			Interface:  capture.Request.Interface,
			Channel:    capture.Request.Channel,
			Band:       capture.Request.Band,
			StartTime:  capture.StartTime,
			Status:     "running",
			OutputFile: capture.OutputFile,
			PMKIDs:     capture.PMKIDs,
		})
	}
	return captures
}

func (s *HcxdumptoolService) monitorCapture(capture *activeCapture) {
	defer close(capture.Done)

	ticker := time.NewTicker(3 * time.Second)
	defer ticker.Stop()

	done := make(chan error)
	go func() {
		done <- capture.Process.Wait()
	}()

	for {
		select {
		case <-done:
			return
		case <-ticker.C:
			if _, err := os.Stat(capture.OutputFile); err == nil {
				pmkids, _ := ParseHc22000(capture.OutputFile)
				capture.PMKIDs = pmkids
			}
		}
	}
}

// ParseHc22000 parses .hc22000 file and extracts PMKID entries.
func ParseHc22000(filePath string) ([]PMKIDEntry, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	var entries []PMKIDEntry
	scanner := bufio.NewScanner(file)

	re := regexp.MustCompile(`^WPA\*01\*([a-fA-F0-9]+)\*([a-fA-F0-9]+)\*([a-fA-F0-9]+)\*([a-zA-Z0-9]+)`)

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		matches := re.FindStringSubmatch(line)
		if len(matches) >= 5 {
			bssid := formatMAC(matches[2])
			entry := PMKIDEntry{
				BSSID:    bssid,
				ESSID:    matches[4],
				PMKID:    matches[1],
				HashLine: line,
			}
			entries = append(entries, entry)
		}
	}

	return entries, scanner.Err()
}

func formatMAC(hexMAC string) string {
	if len(hexMAC) != 12 {
		return hexMAC
	}
	var parts []string
	for i := 0; i < 12; i += 2 {
		parts = append(parts, hexMAC[i:i+2])
	}
	return strings.Join(parts, ":")
}

// ParseHcxdumptoolOutput parses stdout/stderr for progress info.
func ParseHcxdumptoolOutput(output string) (captured int, bssids []string) {
	pmkidRegex := regexp.MustCompile(`PMKID found for ([a-fA-F0-9:]+)`)
	matches := pmkidRegex.FindAllStringSubmatch(output, -1)
	
	seen := make(map[string]bool)
	for _, match := range matches {
		if len(match) >= 2 {
			bssid := match[1]
			if !seen[bssid] {
				seen[bssid] = true
				bssids = append(bssids, bssid)
				captured++
			}
		}
	}
	return captured, bssids
}