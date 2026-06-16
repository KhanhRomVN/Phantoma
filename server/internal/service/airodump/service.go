package airodump

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"sync"
	"time"

	"github.com/phantoma/server/internal/service/wireless"
)

// Service manages airodump-ng scanning operations.
type Service struct {
	executor    *wireless.CommandExecutor
	currentScan *ActiveScan
	mu          sync.RWMutex
}

// ActiveScan represents a running scan session.
type ActiveScan struct {
	ID         string
	Interface  string
	Channel    int
	Band       string
	StartTime  time.Time
	Process    *exec.Cmd
	CancelFunc context.CancelFunc
	OutputFile string
	CSVFile    string
	Networks   []Network
	Clients    []Client
	Done       chan bool
}

// NewService creates a new airodump service.
func NewService() *Service {
	return &Service{
		executor: wireless.NewCommandExecutor(true, 0), // sudo enabled, no timeout for continuous scan
	}
}

// StartScan begins airodump-ng on the specified interface and channel.
func (s *Service) StartScan(iface string, channel int, band string) (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.currentScan != nil {
		return "", fmt.Errorf("scan already in progress")
	}

	scanID := fmt.Sprintf("scan_%d", time.Now().UnixNano())
	tempDir := fmt.Sprintf("/tmp/airodump_%s", scanID)
	if err := os.MkdirAll(tempDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create temp dir: %w", err)
	}

	outputFile := fmt.Sprintf("%s/capture", tempDir)
	csvFile := fmt.Sprintf("%s/capture.csv", tempDir)

	ctx, cancel := context.WithCancel(context.Background())
	cmd := exec.CommandContext(ctx,
		"sudo", "airodump-ng",
		"--band", band,
		"-c", fmt.Sprintf("%d", channel),
		"-w", outputFile,
		"--output-format", "csv",
		iface,
	)

	if err := cmd.Start(); err != nil {
		cancel()
		return "", fmt.Errorf("failed to start airodump-ng: %w", err)
	}

	s.currentScan = &ActiveScan{
		ID:         scanID,
		Interface:  iface,
		Channel:    channel,
		Band:       band,
		StartTime:  time.Now(),
		Process:    cmd,
		CancelFunc: cancel,
		OutputFile: outputFile,
		CSVFile:    csvFile,
		Done:       make(chan bool),
	}

	// Start background parser
	go s.parseLoop(s.currentScan)

	return scanID, nil
}

// StopScan terminates the active scan.
func (s *Service) StopScan() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.currentScan == nil {
		return fmt.Errorf("no active scan")
	}

	s.currentScan.CancelFunc()
	<-s.currentScan.Done

	s.currentScan = nil
	return nil
}

// GetResults returns the current scan results.
func (s *Service) GetResults() (*ScanResult, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if s.currentScan == nil {
		return nil, fmt.Errorf("no active scan")
	}

	return &ScanResult{
		Networks:  s.currentScan.Networks,
		Clients:   s.currentScan.Clients,
		StartTime: s.currentScan.StartTime,
	}, nil
}

// parseLoop continuously reads and parses airodump-ng CSV output.
func (s *Service) parseLoop(scan *ActiveScan) {
	defer close(scan.Done)

	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	// Channel to wait for process exit
	done := make(chan error)
	go func() {
		done <- scan.Process.Wait()
	}()

	for {
		select {
		case <-done:
			return
		case <-ticker.C:
			s.parseCSV(scan)
		}
	}
}

// parseCSV reads the CSV file and updates networks and clients.
func (s *Service) parseCSV(scan *ActiveScan) {
	// Read CSV file
	data, err := os.ReadFile(scan.CSVFile)
	if err != nil {
		return
	}

	networks, err := ParseCSVOutput(string(data))
	if err != nil {
		return
	}

	clients, err := ParseStationCSV(string(data))
	if err != nil {
		return
	}

	// Add vendor info
	for i := range networks {
		networks[i].Vendor = VendorLookup(networks[i].BSSID)
		networks[i].CrackProbability = CalculateCrackProbability(networks[i])
	}
	for i := range clients {
		clients[i].Vendor = VendorLookup(clients[i].MAC)
	}

	// Reassociate clients with networks
	networks = ReassociateClients(networks, clients)

	scan.Networks = networks
	scan.Clients = clients
}

// IsScanning returns whether a scan is active.
func (s *Service) IsScanning() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.currentScan != nil
}