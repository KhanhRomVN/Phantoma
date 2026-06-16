package hashcat

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"sync"
	"time"

	"github.com/phantoma/server/internal/service/wireless"
)

// Service manages hashcat password cracking operations.
type Service struct {
	executor    *wireless.CommandExecutor
	currentJobs map[string]*ActiveJob
	mu          sync.RWMutex
}

// ActiveJob represents a running hashcat job.
type ActiveJob struct {
	ID         string
	Request    CrackRequest
	StartTime  time.Time
	Process    *exec.Cmd
	CancelFunc context.CancelFunc
	Progress   float64
	Speed      int64
	Recovered  int
	Cracked    map[string]string
	Status     string
	Done       chan bool
}

// NewService creates a new hashcat service.
func NewService() *Service {
	return &Service{
		executor:    wireless.NewCommandExecutor(true, 0),
		currentJobs: make(map[string]*ActiveJob),
	}
}

// StartCrack begins a password cracking job.
func (s *Service) StartCrack(req CrackRequest) (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if req.HashFile == "" {
		return "", fmt.Errorf("hash file is required")
	}
	if req.Wordlist == "" && req.Mask == "" {
		return "", fmt.Errorf("wordlist or mask is required")
	}

	jobID := fmt.Sprintf("crack_%d", time.Now().UnixNano())
	outFile := fmt.Sprintf("/tmp/hashcat_%s.out", jobID)

	// Build command arguments
	args := []string{
		"hashcat",
		"-m", fmt.Sprintf("%d", req.HashType),
		"-a", fmt.Sprintf("%d", req.AttackMode),
		"-o", outFile,
		"--outfile-format=2", // hash:password format
		"--status", "--status-timer=1",
		"--potfile-disable", // Disable potfile for multiple runs
	}

	// Add GPU/CPU options
	if len(req.GPUIDs) > 0 {
		args = append(args, "-d", fmt.Sprintf("%v", req.GPUIDs))
	}
	if req.Threads > 0 {
		args = append(args, "-w", fmt.Sprintf("%d", req.Threads))
	}

	// Add hash file
	args = append(args, req.HashFile)

	// Add wordlist or mask
	if req.Wordlist != "" {
		args = append(args, req.Wordlist)
	} else if req.Mask != "" {
		args = append(args, req.Mask)
	}

	// Add rules if specified
	if req.Rules != "" {
		args = append(args, "-r", req.Rules)
	}

	ctx, cancel := context.WithCancel(context.Background())
	cmd := exec.CommandContext(ctx, "sudo", args...)

	if err := cmd.Start(); err != nil {
		cancel()
		return "", fmt.Errorf("failed to start hashcat: %w", err)
	}

	job := &ActiveJob{
		ID:         jobID,
		Request:    req,
		StartTime:  time.Now(),
		Process:    cmd,
		CancelFunc: cancel,
		Cracked:    make(map[string]string),
		Status:     "running",
		Done:       make(chan bool),
	}

	s.currentJobs[jobID] = job

	// Start monitoring goroutine
	go s.monitorJob(job, outFile)

	return jobID, nil
}

// StopCrack terminates a cracking job.
func (s *Service) StopCrack(jobID string) (*CrackJob, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	job, exists := s.currentJobs[jobID]
	if !exists {
		return nil, fmt.Errorf("job not found: %s", jobID)
	}

	job.CancelFunc()
	<-job.Done

	result := &CrackJob{
		ID:         job.ID,
		HashFile:   job.Request.HashFile,
		Wordlist:   job.Request.Wordlist,
		HashType:   job.Request.HashType,
		AttackMode: job.Request.AttackMode,
		Status:     "stopped",
		Progress:   job.Progress,
		Speed:      job.Speed,
		Recovered:  job.Recovered,
		CrackedPasswords: job.Cracked,
		StartTime:  job.StartTime,
	}

	delete(s.currentJobs, jobID)
	return result, nil
}

// GetJobStatus returns the status of a job.
func (s *Service) GetJobStatus(jobID string) (*CrackJob, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	job, exists := s.currentJobs[jobID]
	if !exists {
		return nil, fmt.Errorf("job not found: %s", jobID)
	}

	return &CrackJob{
		ID:         job.ID,
		HashFile:   job.Request.HashFile,
		Wordlist:   job.Request.Wordlist,
		HashType:   job.Request.HashType,
		AttackMode: job.Request.AttackMode,
		Status:     job.Status,
		Progress:   job.Progress,
		Speed:      job.Speed,
		Recovered:  job.Recovered,
		CrackedPasswords: job.Cracked,
		StartTime:  job.StartTime,
	}, nil
}

// ListJobs returns all active jobs.
func (s *Service) ListJobs() []CrackJob {
	s.mu.RLock()
	defer s.mu.RUnlock()

	jobs := make([]CrackJob, 0, len(s.currentJobs))
	for _, job := range s.currentJobs {
		jobs = append(jobs, CrackJob{
			ID:         job.ID,
			HashFile:   job.Request.HashFile,
			Wordlist:   job.Request.Wordlist,
			HashType:   job.Request.HashType,
			AttackMode: job.Request.AttackMode,
			Status:     job.Status,
			Progress:   job.Progress,
			Speed:      job.Speed,
			Recovered:  job.Recovered,
			StartTime:  job.StartTime,
		})
	}
	return jobs
}

// monitorJob tracks hashcat progress and output.
func (s *Service) monitorJob(job *ActiveJob, resultFile string) {
	defer close(job.Done)

	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	// Channel for process exit
	done := make(chan error)
	go func() {
		done <- job.Process.Wait()
	}()

	for {
		select {
		case <-done:
			// Parse final results from output file
			job.Status = "completed"
			s.parseResultFile(resultFile, job)
			return
		case <-ticker.C:
			// Simulate progress (will be replaced with actual parsing)
			if job.Progress < 100 {
				job.Progress += 5
			}
			if job.Progress >= 100 {
				job.Progress = 100
			}
			job.Speed = 10000 // Mock speed
		}
	}
}

// parseResultFile reads hashcat output file for cracked passwords.
func (s *Service) parseResultFile(filePath string, job *ActiveJob) {
	data, err := os.ReadFile(filePath)
	if err != nil {
		return
	}
	cracked := ParseCrackedPasswords(string(data))
	for hash, pass := range cracked {
		job.Cracked[hash] = pass
	}
	job.Recovered = len(job.Cracked)
}