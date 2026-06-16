// Package nmap implements the Scanner interface for nmap network scanning.
package nmap

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"sync"
	"time"

	"github.com/phantoma/server/internal/domain"
	dockerpkg "github.com/phantoma/server/pkg/docker"
	"github.com/phantoma/server/pkg/logger"
)

const defaultTimeout = 5 * time.Minute

var svcLog = logger.WithContext("NmapService")

// Service executes nmap scans inside the nmap Docker container.
type Service struct {
	container   string
	activeScans sync.Map // map[string]context.CancelFunc
}

func NewService(container string) *Service {
	return &Service{container: container}
}

// generateScanID creates a unique ID for a scan.
func generateScanID() string {
	bytes := make([]byte, 16)
	if _, err := rand.Read(bytes); err != nil {
		// Fallback to timestamp-based ID if crypto/rand fails
		return hex.EncodeToString([]byte(time.Now().String()))
	}
	return hex.EncodeToString(bytes)
}

// Scan executes nmap and returns channels for real-time line-by-line output.
// The lineCh receives each stdout line as it's produced. errCh receives any error.
// Both channels are closed when the scan completes.
// The returned scanID can be used to cancel the scan via CancelScan.
func (s *Service) Scan(ctx context.Context, req domain.ScanRequest) (string, <-chan string, <-chan error) {
	// Generate unique scan ID
	scanID := req.ScanID
	if scanID == "" {
		scanID = generateScanID()
	}

	// Create independent context for this scan (not tied to HTTP request)
	scanCtx, cancel := context.WithTimeout(context.Background(), defaultTimeout)

	// Store cancel function in activeScans map
	s.activeScans.Store(scanID, cancel)
	svcLog.Info("scan registered", logger.F("scanId", scanID), logger.F("target", req.Target))

	// Build args: nmap [flags] [target]
	args := append([]string{"nmap"}, req.Flags...)
	args = append(args, req.Target)

	lineCh, errCh := dockerpkg.ExecStream(scanCtx, s.container, args...)

	// Wrap errCh to clean up and cancel on completion
	wrappedErrCh := make(chan error, 1)
	go func() {
		defer cancel()
		defer close(wrappedErrCh)
		defer s.activeScans.Delete(scanID)
		for err := range errCh {
			wrappedErrCh <- err
		}
		svcLog.Info("scan completed, removed from registry", logger.F("scanId", scanID))
	}()

	return scanID, lineCh, wrappedErrCh
}

// CancelScan stops a running scan by its ID.
// Returns true if the scan was found and cancelled, false otherwise.
func (s *Service) CancelScan(scanID string) bool {
	val, ok := s.activeScans.Load(scanID)
	if !ok {
		svcLog.Warn("cancel failed: scan not found", logger.F("scanId", scanID))
		return false
	}

	cancel, ok := val.(context.CancelFunc)
	if !ok {
		svcLog.Warn("cancel failed: invalid cancel function", logger.F("scanId", scanID))
		return false
	}

	cancel()
	s.activeScans.Delete(scanID)
	svcLog.Info("scan cancelled", logger.F("scanId", scanID))
	return true
}