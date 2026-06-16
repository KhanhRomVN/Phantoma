package hcxdumptool

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"sync"
	"time"

	"github.com/phantoma/server/internal/service/wireless"
)

// Service manages hcxdumptool PMKID capture operations.
type Service struct {
	executor        *wireless.CommandExecutor
	currentCaptures map[string]*ActiveCapture
	mu              sync.RWMutex
}

// ActiveCapture represents a running PMKID capture session.
type ActiveCapture struct {
	ID         string
	Request    CaptureRequest
	StartTime  time.Time
	Process    *exec.Cmd
	CancelFunc context.CancelFunc
	OutputFile string
	PMKIDs     []PMKIDEntry
	Done       chan bool
}

// NewService creates a new hcxdumptool service.
func NewService() *Service {
	return &Service{
		executor:        wireless.NewCommandExecutor(true, 0),
		currentCaptures: make(map[string]*ActiveCapture),
	}
}

// StartCapture begins PMKID capture on the specified interface.
func (s *Service) StartCapture(req CaptureRequest) (string, error) {
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

	// Build command arguments
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

	capture := &ActiveCapture{
		ID:         captureID,
		Request:    req,
		StartTime:  time.Now(),
		Process:    cmd,
		CancelFunc: cancel,
		OutputFile: finalFile,
		Done:       make(chan bool),
	}

	s.currentCaptures[captureID] = capture

	// Start background parser
	go s.monitorCapture(capture)

	return captureID, nil
}

// StopCapture terminates the PMKID capture.
func (s *Service) StopCapture(captureID string) (*StopCaptureResponse, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	capture, exists := s.currentCaptures[captureID]
	if !exists {
		return nil, fmt.Errorf("capture not found: %s", captureID)
	}

	capture.CancelFunc()
	<-capture.Done

	// Parse final output
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
func (s *Service) GetCaptureStatus(captureID string) (*PMKIDCapture, error) {
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
func (s *Service) ListCaptures() []PMKIDCapture {
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

// monitorCapture tracks PMKID capture progress.
func (s *Service) monitorCapture(capture *ActiveCapture) {
	defer close(capture.Done)

	ticker := time.NewTicker(3 * time.Second)
	defer ticker.Stop()

	// Channel to wait for process exit
	done := make(chan error)
	go func() {
		done <- capture.Process.Wait()
	}()

	for {
		select {
		case <-done:
			return
		case <-ticker.C:
			// Parse current .hc22000 file if it exists
			if _, err := os.Stat(capture.OutputFile); err == nil {
				pmkids, _ := ParseHc22000(capture.OutputFile)
				capture.PMKIDs = pmkids
			}
		}
	}
}