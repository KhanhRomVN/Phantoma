package wireless

import (
	"bytes"
	"context"
	"fmt"
	"os/exec"
	"strings"
	"time"
)

// CommandExecutor handles execution of wireless tools with timeout and sudo support.
type CommandExecutor struct {
	sudoEnabled bool
	timeout     time.Duration
}

// NewCommandExecutor creates a new executor with optional sudo.
func NewCommandExecutor(useSudo bool, timeoutSec int) *CommandExecutor {
	return &CommandExecutor{
		sudoEnabled: useSudo,
		timeout:     time.Duration(timeoutSec) * time.Second,
	}
}

// Execute runs a command and returns stdout, stderr, and error.
func (e *CommandExecutor) Execute(ctx context.Context, cmd string, args ...string) (stdout, stderr string, err error) {
	var cmdWithArgs []string
	if e.sudoEnabled {
		cmdWithArgs = append([]string{"sudo"}, cmd)
	} else {
		cmdWithArgs = []string{cmd}
	}
	cmdWithArgs = append(cmdWithArgs, args...)

	execCmd := exec.CommandContext(ctx, cmdWithArgs[0], cmdWithArgs[1:]...)

	var stdoutBuf, stderrBuf bytes.Buffer
	execCmd.Stdout = &stdoutBuf
	execCmd.Stderr = &stderrBuf

	// Apply timeout if set
	if e.timeout > 0 {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, e.timeout)
		defer cancel()
		execCmd = exec.CommandContext(ctx, cmdWithArgs[0], cmdWithArgs[1:]...)
		execCmd.Stdout = &stdoutBuf
		execCmd.Stderr = &stderrBuf
	}

	err = execCmd.Run()
	return stdoutBuf.String(), stderrBuf.String(), err
}

// ExecuteStream runs a command and streams output to callbacks.
func (e *CommandExecutor) ExecuteStream(ctx context.Context, onStdout func(string), onStderr func(string), cmd string, args ...string) error {
	var cmdWithArgs []string
	if e.sudoEnabled {
		cmdWithArgs = append([]string{"sudo"}, cmd)
	} else {
		cmdWithArgs = []string{cmd}
	}
	cmdWithArgs = append(cmdWithArgs, args...)

	execCmd := exec.CommandContext(ctx, cmdWithArgs[0], cmdWithArgs[1:]...)

	stdout, err := execCmd.StdoutPipe()
	if err != nil {
		return err
	}
	stderr, err := execCmd.StderrPipe()
	if err != nil {
		return err
	}

	if err := execCmd.Start(); err != nil {
		return err
	}

	// Read stdout
	go func() {
		buf := make([]byte, 1024)
		for {
			n, err := stdout.Read(buf)
			if n > 0 {
				onStdout(string(buf[:n]))
			}
			if err != nil {
				break
			}
		}
	}()

	// Read stderr
	go func() {
		buf := make([]byte, 1024)
		for {
			n, err := stderr.Read(buf)
			if n > 0 {
				onStderr(string(buf[:n]))
			}
			if err != nil {
				break
			}
		}
	}()

	return execCmd.Wait()
}

// CheckTool checks if a tool is installed and accessible.
func CheckTool(toolName string) bool {
	_, err := exec.LookPath(toolName)
	return err == nil
}

// GetInterfaces returns list of wireless interfaces.
func GetInterfaces() ([]string, error) {
	cmd := exec.Command("iw", "dev")
	output, err := cmd.Output()
	if err != nil {
		// Fallback to ip command
		cmd = exec.Command("ip", "link")
		output, err = cmd.Output()
		if err != nil {
			return nil, fmt.Errorf("failed to list interfaces: %w", err)
		}
	}

	lines := strings.Split(string(output), "\n")
	var interfaces []string
	for _, line := range lines {
		if strings.Contains(line, "Interface") {
			parts := strings.Fields(line)
			if len(parts) >= 2 {
				interfaces = append(interfaces, parts[1])
			}
		}
	}
	return interfaces, nil
}

// EnableMonitorMode puts an interface into monitor mode.
func EnableMonitorMode(iface string) (string, error) {
	cmd := exec.Command("sudo", "airmon-ng", "start", iface)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("failed to enable monitor mode: %w - %s", err, output)
	}
	// airmon-ng typically creates wlan0mon
	return iface + "mon", nil
}

// DisableMonitorMode stops monitor mode.
func DisableMonitorMode(iface string) error {
	cmd := exec.Command("sudo", "airmon-ng", "stop", iface)
	return cmd.Run()
}