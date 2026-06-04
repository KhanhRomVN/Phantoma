package health

import (
	"net/http"

	"github.com/phantoma/server/pkg/response"
)

// Handler returns a simple health check response.
func Handler(w http.ResponseWriter, r *http.Request) {
	response.JSON(w, http.StatusOK, map[string]string{
		"status":  "ok",
		"service": "phantoma-server",
	})
}
