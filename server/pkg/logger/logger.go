// Package logger provides a structured, leveled, colorized logger.
//
// Output format:
// [LEVEL] [file:line] [Context] message | key=value | key=value
package logger

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"
)

// ANSI color codes
const (
	colorReset  = "\033[0m"
	colorGray   = "\033[90m"
	colorWhite  = "\033[97m"
	colorCyan   = "\033[96m"
	colorGreen  = "\033[92m"
	colorYellow = "\033[93m"
	colorRed    = "\033[91m"
)

// Level represents log severity.
type Level int

const (
	LevelDebug Level = iota
	LevelInfo
	LevelWarn
	LevelError
)

var levelLabel = map[Level]string{
	LevelDebug: "DEBUG",
	LevelInfo:  "INFO ",
	LevelWarn:  "WARN ",
	LevelError: "ERROR",
}

var levelColor = map[Level]string{
	LevelDebug: colorCyan,
	LevelInfo:  colorGreen,
	LevelWarn:  colorYellow,
	LevelError: colorRed,
}

// Logger is a leveled, structured, colorized logger.
type Logger struct {
	mu      sync.Mutex
	out     io.Writer
	level   Level
	context string // optional context prefix, e.g. "[NmapHandler]"
	noColor bool   // disable color when writing to non-tty (e.g. log file)
}

var std = New(os.Stdout, LevelDebug)

// New creates a new Logger writing to out at the given minimum level.
// Color is automatically disabled if out is not a terminal.
func New(out io.Writer, level Level) *Logger {
	return &Logger{
		out:     out,
		level:   level,
		noColor: !isTerminal(out),
	}
}

// WithContext returns a child logger that prepends [ctx] to every message.
func (l *Logger) WithContext(ctx string) *Logger {
	return &Logger{
		out:     l.out,
		level:   l.level,
		context: ctx,
		noColor: l.noColor,
	}
}

// WithContext on the default logger.
func WithContext(ctx string) *Logger { return std.WithContext(ctx) }

// SetLevel changes the minimum log level on the default logger.
func SetLevel(level Level) { std.level = level }

// SetOutput changes the writer on the default logger.
// Automatically disables color if out is not a terminal.
func SetOutput(w io.Writer) {
	std.out = w
	std.noColor = !isTerminal(w)
}

// --- Public helpers on default logger ---

func Debug(msg string, fields ...Field) { std.log(LevelDebug, 1, msg, fields...) }
func Info(msg string, fields ...Field)  { std.log(LevelInfo, 1, msg, fields...) }
func Warn(msg string, fields ...Field)  { std.log(LevelWarn, 1, msg, fields...) }
func Error(msg string, fields ...Field) { std.log(LevelError, 1, msg, fields...) }

// --- Methods on Logger instance ---

func (l *Logger) Debug(msg string, fields ...Field) { l.log(LevelDebug, 1, msg, fields...) }
func (l *Logger) Info(msg string, fields ...Field)  { l.log(LevelInfo, 1, msg, fields...) }
func (l *Logger) Warn(msg string, fields ...Field)  { l.log(LevelWarn, 1, msg, fields...) }
func (l *Logger) Error(msg string, fields ...Field) { l.log(LevelError, 1, msg, fields...) }

// log is the core write method.
func (l *Logger) log(level Level, skip int, msg string, fields ...Field) {
	if level < l.level {
		return
	}

	// Resolve caller file:line
	_, file, line, ok := runtime.Caller(skip + 1)
	if !ok {
		file, line = "???", 0
	}
	file = trimPath(file)

	// Build fields string: key=value | key=value
	var fb strings.Builder
	for i, f := range fields {
		if i > 0 {
			fb.WriteString(" | ")
		}
		fb.WriteString(f.Key)
		fb.WriteString("=")
		fb.WriteString(fmt.Sprintf("%v", f.Val))
	}

	var line_ strings.Builder

	if l.noColor {
		// Plain text (no ANSI) — for file output / CI
		line_.WriteString(fmt.Sprintf("[%s] [%s:%d] ", levelLabel[level], file, line))
		if l.context != "" {
			line_.WriteString(fmt.Sprintf("[%s] ", l.context))
		}
		line_.WriteString(msg)
		if fb.Len() > 0 {
			line_.WriteString(" | ")
			line_.WriteString(fb.String())
		}
	} else {
		// Colorized output
		lc := levelColor[level]
		ll := levelLabel[level]

		// [LEVEL] — colored
		line_.WriteString(lc)
		line_.WriteString("[")
		line_.WriteString(ll)
		line_.WriteString("]")
		line_.WriteString(colorReset)

		// [file:line] — gray
		line_.WriteString(" ")
		line_.WriteString(colorGray)
		line_.WriteString(fmt.Sprintf("[%s:%d]", file, line))
		line_.WriteString(colorReset)

		// [Context] — gray (optional)
		if l.context != "" {
			line_.WriteString(" ")
			line_.WriteString(colorGray)
			line_.WriteString(fmt.Sprintf("[%s]", l.context))
			line_.WriteString(colorReset)
		}

		// message — white
		line_.WriteString(" ")
		line_.WriteString(colorWhite)
		line_.WriteString(msg)
		line_.WriteString(colorReset)

		// fields — gray
		if fb.Len() > 0 {
			line_.WriteString(colorGray)
			line_.WriteString(" | ")
			line_.WriteString(fb.String())
			line_.WriteString(colorReset)
		}
	}

	l.mu.Lock()
	defer l.mu.Unlock()
	fmt.Fprintln(l.out, line_.String())
}

// trimPath shortens an absolute file path to a project-relative one.
func trimPath(path string) string {
	for _, anchor := range []string{"/server/", "/cmd/", "/internal/", "/pkg/"} {
		if idx := strings.Index(path, anchor); idx != -1 {
			return path[idx+1:]
		}
	}
	return filepath.Base(path)
}

// isTerminal reports whether w is an *os.File connected to a terminal.
func isTerminal(w io.Writer) bool {
	f, ok := w.(*os.File)
	if !ok {
		return false
	}
	// Check if fd refers to a character device (tty)
	fi, err := f.Stat()
	if err != nil {
		return false
	}
	return (fi.Mode() & os.ModeCharDevice) != 0
}

// --- Field helpers ---

// Field is a key-value pair for structured logging.
type Field struct {
	Key string
	Val any
}

// F creates a field. Usage: logger.F("session", id)
func F(key string, val any) Field {
	return Field{Key: key, Val: val}
}

// Since returns a duration field in milliseconds.
func Since(t time.Time) Field {
	return Field{Key: "duration", Val: fmt.Sprintf("%dms", time.Since(t).Milliseconds())}
}