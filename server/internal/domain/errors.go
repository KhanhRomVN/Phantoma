package domain

import "errors"

var (
	ErrInvalidTarget = errors.New("target is required")
	ErrScanTimeout   = errors.New("scan timed out")
	ErrContainerExec = errors.New("failed to execute command in container")
)
