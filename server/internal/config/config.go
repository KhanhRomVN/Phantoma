package config

import (
	"fmt"
	"os"
)

// Config holds all application configuration.
// Values are loaded from environment variables with sensible defaults.
type Config struct {
	Port           string
	Env            string
	DockerHost     string
	NmapContainer  string
	NiktoContainer string
}

func Load() (*Config, error) {
	cfg := &Config{
		Port:           getEnv("PORT", "8080"),
		Env:            getEnv("ENV", "development"),
		DockerHost:     getEnv("DOCKER_HOST", "unix:///var/run/docker.sock"),
		NmapContainer:  getEnv("NMAP_CONTAINER", "nmap"),
		NiktoContainer: getEnv("NIKTO_CONTAINER", "nikto"),
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

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}
