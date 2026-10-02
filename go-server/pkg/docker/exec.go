// Package docker provides helpers for executing commands inside Docker containers.
package docker

import (
	"bufio"
	"bytes"
	"context"
	"io"
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

// ExecStream runs `docker exec <container> <args...>` and streams stdout
// line-by-line through the returned channel. The channel is closed when the
// process exits. Errors during execution are sent to the error channel.
func ExecStream(ctx context.Context, container string, args ...string) (<-chan string, <-chan error) {
	lineCh := make(chan string, 100)
	errCh := make(chan error, 1)

	cmdArgs := append([]string{"exec", container}, args...)

	log.Debug("exec — streaming start",
		logger.F("container", container),
		logger.F("cmd", strings.Join(args, " ")),
	)

	go func() {
		defer close(lineCh)
		defer close(errCh)

		cmd := exec.CommandContext(ctx, "docker", cmdArgs...)

		stdoutPipe, err := cmd.StdoutPipe()
		if err != nil {
			errCh <- err
			return
		}

		stderrPipe, err := cmd.StderrPipe()
		if err != nil {
			errCh <- err
			return
		}

		if err := cmd.Start(); err != nil {
			errCh <- err
			return
		}

		// Read stdout line by line
		scanner := bufio.NewScanner(stdoutPipe)
		for scanner.Scan() {
			select {
			case lineCh <- scanner.Text():
			case <-ctx.Done():
				return
			}
		}

		// Drain stderr
		stderrBytes, _ := io.ReadAll(stderrPipe)
		stderr := strings.TrimSpace(string(stderrBytes))

		// Wait for process to finish
		err = cmd.Wait()

		if err != nil {
			log.Error("exec — stream failed",
				logger.F("container", container),
				logger.F("error", err),
				logger.F("stderr", stderr),
			)
			errCh <- err
		} else {
			log.Debug("exec — stream complete",
				logger.F("container", container),
			)
		}
	}()

	return lineCh, errCh
}