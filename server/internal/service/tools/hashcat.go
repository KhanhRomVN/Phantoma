package tools

import (
	"bufio"
	"context"
	"fmt"
	"os"
	"os/exec"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/phantoma/server/internal/service/wireless"
)

// HashType represents the hash format supported by hashcat.
type HashType int

const (
	HashTypeWPA   HashType = 2500
	HashTypeWPA2  HashType = 2500
	HashTypeWPA3  HashType = 16800
	HashTypePMKID HashType = 22000
)

// AttackMode represents hashcat attack modes.
type AttackMode int

const (
	AttackModeStraight        AttackMode = 0
	AttackModeCombination     AttackMode = 1
	AttackModeMask            AttackMode = 3
	AttackModeHybridWordMask  AttackMode = 6
	AttackModeHybridMaskWord  AttackMode = 7
)

// CrackJob represents a password cracking task.
type CrackJob struct {
	ID               string            `json:"id"`
	HashFile         string            `json:"hash_file"`
	Wordlist         string            `json:"wordlist,omitempty"`
	HashType         HashType          `json:"hash_type"`
	AttackMode       AttackMode        `json:"attack_mode"`
	Mask             string            `json:"mask,omitempty"`
	Status           string            `json:"status"`
	Progress         float64           `json:"progress"`
	Speed            int64             `json:"speed"`
	Recovered        int               `json:"recovered"`
	TotalHashes      int               `json:"total_hashes"`
	CrackedPasswords map[string]string `json:"cracked_passwords"`
	StartTime        time.Time         `json:"start_time"`
	EndTime          *time.Time        `json:"end_time,omitempty"`
	OutputFile       string            `json:"output_file,omitempty"`
}

// CrackRequest represents the request to start a cracking job.
type CrackRequest struct {
	HashFile   string     `json:"hash_file"`
	Wordlist   string     `json:"wordlist"`
	HashType   HashType   `json:"hash_type"`
	AttackMode AttackMode `json:"attack_mode"`
	Mask       string     `json:"mask,omitempty"`
	Rules      string     `json:"rules,omitempty"`
	GPUIDs     []int      `json:"gpu_ids,omitempty"`
	Threads    int        `json:"threads,omitempty"`
}

// CrackResponse represents the response for starting a crack job.
type CrackResponse struct {
	JobID string `json:"job_id"`
}

// ProgressUpdate represents real-time progress.
type ProgressUpdate struct {
	JobID     string    `json:"job_id"`
	Progress  float64   `json:"progress"`
	Speed     int64     `json:"speed"`
	Recovered int       `json:"recovered"`
	Status    string    `json:"status"`
	Timestamp time.Time `json:"timestamp"`
}

// HashcatService manages hashcat password cracking operations.
type HashcatService struct {
	executor    *wireless.CommandExecutor
	currentJobs map[string]*activeJob
	mu          sync.RWMutex
}

type activeJob struct {
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

// NewHashcatService creates a new hashcat service.
func NewHashcatService() *HashcatService {
	return &HashcatService{
		executor:    wireless.NewCommandExecutor(true, 0),
		currentJobs: make(map[string]*activeJob),
	}
}

// StartCrack begins a password cracking job.
func (s *HashcatService) StartCrack(req CrackRequest) (string, error) {
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

	args := []string{
		"hashcat",
		"-m", fmt.Sprintf("%d", req.HashType),
		"-a", fmt.Sprintf("%d", req.AttackMode),
		"-o", outFile,
		"--outfile-format=2",
		"--status", "--status-timer=1",
		"--potfile-disable",
	}

	if len(req.GPUIDs) > 0 {
		args = append(args, "-d", fmt.Sprintf("%v", req.GPUIDs))
	}
	if req.Threads > 0 {
		args = append(args, "-w", fmt.Sprintf("%d", req.Threads))
	}

	args = append(args, req.HashFile)

	if req.Wordlist != "" {
		args = append(args, req.Wordlist)
	} else if req.Mask != "" {
		args = append(args, req.Mask)
	}

	if req.Rules != "" {
		args = append(args, "-r", req.Rules)
	}

	ctx, cancel := context.WithCancel(context.Background())
	cmd := exec.CommandContext(ctx, "sudo", args...)

	if err := cmd.Start(); err != nil {
		cancel()
		return "", fmt.Errorf("failed to start hashcat: %w", err)
	}

	job := &activeJob{
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

	go s.monitorJob(job, outFile)

	return jobID, nil
}

// StopCrack terminates a cracking job.
func (s *HashcatService) StopCrack(jobID string) (*CrackJob, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	job, exists := s.currentJobs[jobID]
	if !exists {
		return nil, fmt.Errorf("job not found: %s", jobID)
	}

	job.CancelFunc()
	<-job.Done

	result := &CrackJob{
		ID:               job.ID,
		HashFile:         job.Request.HashFile,
		Wordlist:         job.Request.Wordlist,
		HashType:         job.Request.HashType,
		AttackMode:       job.Request.AttackMode,
		Status:           "stopped",
		Progress:         job.Progress,
		Speed:            job.Speed,
		Recovered:        job.Recovered,
		CrackedPasswords: job.Cracked,
		StartTime:        job.StartTime,
	}

	delete(s.currentJobs, jobID)
	return result, nil
}

// GetJobStatus returns the status of a job.
func (s *HashcatService) GetJobStatus(jobID string) (*CrackJob, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	job, exists := s.currentJobs[jobID]
	if !exists {
		return nil, fmt.Errorf("job not found: %s", jobID)
	}

	return &CrackJob{
		ID:               job.ID,
		HashFile:         job.Request.HashFile,
		Wordlist:         job.Request.Wordlist,
		HashType:         job.Request.HashType,
		AttackMode:       job.Request.AttackMode,
		Status:           job.Status,
		Progress:         job.Progress,
		Speed:            job.Speed,
		Recovered:        job.Recovered,
		CrackedPasswords: job.Cracked,
		StartTime:        job.StartTime,
	}, nil
}

// ListJobs returns all active jobs.
func (s *HashcatService) ListJobs() []CrackJob {
	s.mu.RLock()
	defer s.mu.RUnlock()

	jobs := make([]CrackJob, 0, len(s.currentJobs))
	for _, job := range s.currentJobs {
		jobs = append(jobs, CrackJob{
			ID:               job.ID,
			HashFile:         job.Request.HashFile,
			Wordlist:         job.Request.Wordlist,
			HashType:         job.Request.HashType,
			AttackMode:       job.Request.AttackMode,
			Status:           job.Status,
			Progress:         job.Progress,
			Speed:            job.Speed,
			Recovered:        job.Recovered,
			StartTime:        job.StartTime,
		})
	}
	return jobs
}

func (s *HashcatService) monitorJob(job *activeJob, resultFile string) {
	defer close(job.Done)

	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	done := make(chan error)
	go func() {
		done <- job.Process.Wait()
	}()

	for {
		select {
		case <-done:
			job.Status = "completed"
			s.parseResultFile(resultFile, job)
			return
		case <-ticker.C:
			if job.Progress < 100 {
				job.Progress += 5
			}
			if job.Progress >= 100 {
				job.Progress = 100
			}
			job.Speed = 10000
		}
	}
}

func (s *HashcatService) parseResultFile(filePath string, job *activeJob) {
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

// ParseHashcatOutput parses hashcat stdout for progress and results.
func ParseHashcatOutput(output string) (progress float64, speed int64, recovered int) {
	progressRegex := regexp.MustCompile(`Progress\.+:\s+(\d+)/(\d+)\s+\(([\d\.]+)%\)`)
	matches := progressRegex.FindStringSubmatch(output)
	if len(matches) >= 4 {
		progress, _ = strconv.ParseFloat(matches[3], 64)
	}

	speedRegex := regexp.MustCompile(`Speed\.#\d+\.+:\s+(\d+)\s+([KMG]?)H/s`)
	matches = speedRegex.FindStringSubmatch(output)
	if len(matches) >= 2 {
		speedVal, _ := strconv.ParseInt(matches[1], 10, 64)
		speed = speedVal
		switch matches[2] {
		case "K":
			speed = speedVal * 1000
		case "M":
			speed = speedVal * 1000000
		case "G":
			speed = speedVal * 1000000000
		}
	}

	recoveredRegex := regexp.MustCompile(`Recovered\.+:\s+(\d+)/(\d+)`)
	matches = recoveredRegex.FindStringSubmatch(output)
	if len(matches) >= 2 {
		recovered, _ = strconv.Atoi(matches[1])
	}

	return progress, speed, recovered
}

// ParseCrackedPasswords extracts cracked passwords from hashcat output.
func ParseCrackedPasswords(output string) map[string]string {
	cracked := make(map[string]string)

	scanner := bufio.NewScanner(strings.NewReader(output))
	for scanner.Scan() {
		line := scanner.Text()
		if strings.Contains(line, "->") {
			parts := strings.SplitN(line, "->", 2)
			if len(parts) == 2 {
				hash := strings.TrimSpace(parts[0])
				password := strings.TrimSpace(parts[1])
				if hash != "" && password != "" && !strings.Contains(password, "Hash.Target") {
					cracked[hash] = password
				}
			}
		}
	}

	return cracked
}