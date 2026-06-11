// Package middleware provides HTTP middleware for the Phantoma server.
package middleware

import (
	"net/http"
	"time"

	"github.com/phantoma/server/pkg/logger"
)

// responseWriter wraps http.ResponseWriter to capture the status code.
type responseWriter struct {
	http.ResponseWriter
	status int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.status = code
	rw.ResponseWriter.WriteHeader(code)
}

// Flush implements http.Flusher by delegating to the underlying writer.
func (rw *responseWriter) Flush() {
	if flusher, ok := rw.ResponseWriter.(http.Flusher); ok {
		flusher.Flush()
	}
}

// RequestLogger logs every incoming HTTP request in the format:
// [INFO] [middleware/logger.go:N] POST /api/v1/nmap/scan - 200 - 123ms
func RequestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		rw := &responseWriter{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(rw, r)

		logger.Info(
			r.Method+" "+r.URL.Path,
			logger.F("status", rw.status),
			logger.Since(start),
		)
	})
}
