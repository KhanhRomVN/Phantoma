// Package docker provides helpers for executing commands inside Docker containers.
package docker

import (
	"bytes"
	"context"
	"os/exec"
	"strings"

	"github.com/phantoma/server/pkg/logger"
)

var log = logger.WithContext("Docker")

// ExecResult holds stdout/stderr from a docker exec call.
type ExecResult struct {
	Stdout string
	Stderr string
}

// Exec runs `docker exec <container> <args...>` and returns the output.
func Exec(ctx context.Context, container string, args ...string) (ExecResult, error) {
	cmdArgs := append([]string{"exec", container}, args...)

	log.Debug("exec — starting",
		logger.F("container", container),
		logger.F("cmd", strings.Join(args, " ")),
	)

	var stdout, stderr bytes.Buffer
	cmd := exec.CommandContext(ctx, "docker", cmdArgs...)
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()

	result := ExecResult{
		Stdout: stdout.String(),
		Stderr: strings.TrimSpace(stderr.String()),
	}

	if err != nil {
		log.Error("exec — failed",
			logger.F("container", container),
			logger.F("error", err),
			logger.F("stderr", result.Stderr),
		)
	} else {
		log.Debug("exec — complete",
			logger.F("container", container),
			logger.F("bytes", len(result.Stdout)),
		)
	}

	return result, err
}
