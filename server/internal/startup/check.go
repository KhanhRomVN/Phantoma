// Package startup runs pre-flight checks before the server accepts traffic.
package startup

import (
	"context"
	"os/exec"
	"strings"
	"time"

	"github.com/phantoma/server/internal/config"
	"github.com/phantoma/server/pkg/logger"
)

type containerStatus struct {
	name    string
	running bool
	status  string // e.g. "Up 2 hours", "Exited (1)", "not found"
}

// CheckDependencies inspects every required Docker container and logs
// its status. Returns false if any required container is not running.
func CheckDependencies(cfg *config.Config) bool {
	log := logger.WithContext("Startup")

	containers := []string{
		cfg.NmapContainer,
		cfg.NiktoContainer,
		cfg.RustScanContainer,
		cfg.NucleiContainer,
		cfg.SearchsploitContainer,
		cfg.MetasploitContainer,
	}

	allOK := true
	for _, name := range containers {
		cs := inspectContainer(name)
		if cs.running {
			log.Info("container OK",
				logger.F("name", cs.name),
				logger.F("status", cs.status),
			)
		} else {
			log.Warn("container NOT running — scans will fail",
				logger.F("name", cs.name),
				logger.F("status", cs.status),
			)
			allOK = false
		}
	}

	// Also check Docker daemon itself
	if err := checkDockerDaemon(); err != nil {
		log.Error("Docker daemon unreachable", logger.F("error", err))
		return false
	}

	if allOK {
		log.Info("all dependencies ready")
	} else {
		log.Warn("some containers are down — run: make docker-up")
	}

	return allOK
}

// inspectContainer checks a single container's state via `docker inspect`.
func inspectContainer(name string) containerStatus {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	// docker inspect --format '{{.State.Status}}' <name>
	out, err := exec.CommandContext(ctx, "docker", "inspect", "--format", "{{.State.Status}} | {{.State.StartedAt}}", name).Output()
	if err != nil {
		// Container doesn't exist or daemon unreachable
		return containerStatus{name: name, running: false, status: "not found"}
	}

	raw := strings.TrimSpace(string(out))
	parts := strings.SplitN(raw, " | ", 2)
	state := parts[0] // "running", "exited", "restarting", etc.

	running := state == "running"

	// Build a human-readable status
	status := state
	if running && len(parts) == 2 {
		// Parse start time to show uptime
		startedAt := parts[1]
		if t, err := time.Parse(time.RFC3339Nano, startedAt); err == nil {
			uptime := time.Since(t).Round(time.Second)
			status = "running — up " + uptime.String()
		}
	}

	return containerStatus{name: name, running: running, status: status}
}

// checkDockerDaemon runs a lightweight `docker info` to confirm the daemon is up.
func checkDockerDaemon() error {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	return exec.CommandContext(ctx, "docker", "info", "--format", "{{.ServerVersion}}").Run()
}
