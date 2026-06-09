package config

import (
	"fmt"
	"os"
)

// Config holds all application configuration.
// Values are loaded from environment variables with sensible defaults.
type Config struct {
	Port                  string
	Env                   string
	DockerHost            string
	NmapContainer         string
	NiktoContainer        string
	RustScanContainer     string
	NucleiContainer       string
	SearchsploitContainer string
	MetasploitContainer   string
	GoDorkContainer       string
	GauContainer          string
	AmassContainer        string
	AssetfinderContainer  string
	SubfinderContainer    string
}

func Load() (*Config, error) {
	cfg := &Config{
		Port:                  getEnv("PORT", "8080"),
		Env:                   getEnv("ENV", "development"),
		DockerHost:            getEnv("DOCKER_HOST", "unix:///var/run/docker.sock"),
		NmapContainer:         getEnv("NMAP_CONTAINER", "nmap"),
		NiktoContainer:        getEnv("NIKTO_CONTAINER", "nikto"),
		RustScanContainer:     getEnv("RUSTSCAN_CONTAINER", "rustscan"),
		NucleiContainer:       getEnv("NUCLEI_CONTAINER", "nuclei"),
		SearchsploitContainer: getEnv("SEARCHSPLOIT_CONTAINER", "searchsploit"),
		MetasploitContainer:   getEnv("METASPLOIT_CONTAINER", "metasploit"),
		GoDorkContainer:       getEnv("GO_DORK_CONTAINER", "go-dork"),
		GauContainer:          getEnv("GAU_CONTAINER", "gau"),
		AmassContainer:        getEnv("AMASS_CONTAINER", "amass"),
		AssetfinderContainer:  getEnv("ASSETFINDER_CONTAINER", "assetfinder"),
		SubfinderContainer:    getEnv("SUBFINDER_CONTAINER", "subfinder"),
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
