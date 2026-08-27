package emulate

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/phantoma/server/internal/config"
)

// RepeaterFileStorage handles reading/writing repeater content to file system.
type RepeaterFileStorage struct{}

// NewRepeaterFileStorage creates a new file storage instance.
func NewRepeaterFileStorage() *RepeaterFileStorage {
	return &RepeaterFileStorage{}
}

// getRepeaterDir returns the directory path for a repeater request.
// Format: ~/.phantoma/repeaters/{targetId}/repeater_{requestId}/
func (s *RepeaterFileStorage) getRepeaterDir(targetID, requestID string) string {
	appDataDir := config.GetAppDataDir()
	return filepath.Join(appDataDir, "repeaters", targetID, fmt.Sprintf("repeater_%s", requestID))
}

// ensureDir creates directory if not exists.
func (s *RepeaterFileStorage) ensureDir(dir string) error {
	return os.MkdirAll(dir, 0700)
}

// WriteParams writes params JSON content to params.json file.
func (s *RepeaterFileStorage) WriteParams(targetID, requestID, content string) error {
	dir := s.getRepeaterDir(targetID, requestID)
	if err := s.ensureDir(dir); err != nil {
		return fmt.Errorf("create directory: %w", err)
	}

	filePath := filepath.Join(dir, "params.json")
	if err := os.WriteFile(filePath, []byte(content), 0600); err != nil {
		return fmt.Errorf("write params file: %w", err)
	}
	return nil
}

// ReadParams reads params JSON content from params.json file.
func (s *RepeaterFileStorage) ReadParams(targetID, requestID string) (string, error) {
	filePath := filepath.Join(s.getRepeaterDir(targetID, requestID), "params.json")
	data, err := os.ReadFile(filePath)
	if err != nil {
		if os.IsNotExist(err) {
			return "[]", nil // Return empty JSON array if file doesn't exist
		}
		return "", fmt.Errorf("read params file: %w", err)
	}
	return string(data), nil
}

// WriteHeaders writes headers JSON content to headers.json file.
func (s *RepeaterFileStorage) WriteHeaders(targetID, requestID, content string) error {
	dir := s.getRepeaterDir(targetID, requestID)
	if err := s.ensureDir(dir); err != nil {
		return fmt.Errorf("create directory: %w", err)
	}

	filePath := filepath.Join(dir, "headers.json")
	if err := os.WriteFile(filePath, []byte(content), 0600); err != nil {
		return fmt.Errorf("write headers file: %w", err)
	}
	return nil
}

// ReadHeaders reads headers JSON content from headers.json file.
func (s *RepeaterFileStorage) ReadHeaders(targetID, requestID string) (string, error) {
	filePath := filepath.Join(s.getRepeaterDir(targetID, requestID), "headers.json")
	data, err := os.ReadFile(filePath)
	if err != nil {
		if os.IsNotExist(err) {
			return "[]", nil // Return empty JSON array if file doesn't exist
		}
		return "", fmt.Errorf("read headers file: %w", err)
	}
	return string(data), nil
}

// WriteBody writes body content to body.json file.
func (s *RepeaterFileStorage) WriteBody(targetID, requestID, content string) error {
	dir := s.getRepeaterDir(targetID, requestID)
	if err := s.ensureDir(dir); err != nil {
		return fmt.Errorf("create directory: %w", err)
	}

	filePath := filepath.Join(dir, "body.json")
	if err := os.WriteFile(filePath, []byte(content), 0600); err != nil {
		return fmt.Errorf("write body file: %w", err)
	}
	return nil
}

// ReadBody reads body content from body.json file.
func (s *RepeaterFileStorage) ReadBody(targetID, requestID string) (string, error) {
	filePath := filepath.Join(s.getRepeaterDir(targetID, requestID), "body.json")
	data, err := os.ReadFile(filePath)
	if err != nil {
		if os.IsNotExist(err) {
			return "", nil // Return empty string if file doesn't exist
		}
		return "", fmt.Errorf("read body file: %w", err)
	}
	return string(data), nil
}

// DeleteAll deletes all files for a repeater request.
func (s *RepeaterFileStorage) DeleteAll(targetID, requestID string) error {
	dir := s.getRepeaterDir(targetID, requestID)
	if err := os.RemoveAll(dir); err != nil {
		return fmt.Errorf("delete repeater directory: %w", err)
	}
	return nil
}
