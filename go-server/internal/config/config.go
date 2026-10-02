package config

import (
	"fmt"
	"os"
	"os/user"
	"strings"
)

// Config holds all application configuration.
// Values are loaded from environment variables with sensible defaults.
type Config struct {
	Port   string
	Env    string
	DBPath string
}

func Load() (*Config, error) {
	cfg := &Config{
		Port:   getEnv("PORT", "8080"),
		Env:    getEnv("ENV", "development"),
		DBPath: getEnv("DB_PATH", expandHome("~/.phantoma/phantoma.sql")),
	}

	if err := cfg.validate(); err != nil {
		return nil, err
	}

	return cfg, nil
}

func (c *Config) validate() error {
	if c.Port == "" {
		return fmt.Errorf("PORT is required")
	}
	return nil
}

func (c *Config) IsDevelopment() bool {
	return c.Env == "development"
}

// SetDBPath cập nhật đường dẫn database trong config.
func (c *Config) SetDBPath(path string) {
	c.DBPath = path
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}

// expandHome replaces ~ with the user's home directory.
func expandHome(path string) string {
	if !strings.HasPrefix(path, "~") {
		return path
	}
	usr, err := user.Current()
	if err != nil {
		return path
	}
	return strings.Replace(path, "~", usr.HomeDir, 1)
}

// GetAppDataDir returns the app data directory path (~/.phantoma)
func GetAppDataDir() string {
	return expandHome("~/.phantoma")
}