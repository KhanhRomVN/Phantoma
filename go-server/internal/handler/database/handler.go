package database

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"

	"github.com/phantoma/server/internal/config"
	"github.com/phantoma/server/internal/database"
	"github.com/phantoma/server/pkg/response"
)

// Handler xử lý HTTP requests cho database configuration.
type Handler struct {
	cfg *config.Config
}

// NewHandler tạo Database handler mới.
func NewHandler(cfg *config.Config) *Handler {
	return &Handler{cfg: cfg}
}

// GetPath handles GET /api/v1/database/path
// Trả về đường dẫn database hiện tại.
func (h *Handler) GetPath(w http.ResponseWriter, r *http.Request) {
	path := database.GetCurrentPath()
	if path == "" {
		path = h.cfg.DBPath
	}

	response.JSON(w, http.StatusOK, map[string]string{
		"path": path,
	})
}

// UpdatePathRequest định nghĩa payload cho PUT /api/v1/database/path
type UpdatePathRequest struct {
	Path string `json:"path"`
}

// UpdatePath handles PUT /api/v1/database/path
// Cập nhật đường dẫn database mới và re-initialize database.
func (h *Handler) UpdatePath(w http.ResponseWriter, r *http.Request) {
	var req UpdatePathRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body: "+err.Error())
		return
	}

	if req.Path == "" {
		response.Error(w, http.StatusBadRequest, "path is required")
		return
	}

	// Kiểm tra tính hợp lệ của đường dẫn mới
	// 1. Kiểm tra thư mục cha tồn tại hoặc có thể tạo
	dir := filepath.Dir(req.Path)
	if err := os.MkdirAll(dir, 0755); err != nil {
		response.Error(w, http.StatusBadRequest, "cannot create directory: "+err.Error())
		return
	}

	// 2. Kiểm tra quyền ghi vào thư mục (tạo file test)
	testFile := filepath.Join(dir, ".phantoma_test_write")
	if err := os.WriteFile(testFile, []byte("test"), 0644); err != nil {
		response.Error(w, http.StatusBadRequest, "no write permission in directory: "+err.Error())
		return
	}
	os.Remove(testFile)

	// Cập nhật config
	h.cfg.SetDBPath(req.Path)

	// Re-initialize database
	if err := database.ReInit(req.Path); err != nil {
		response.Error(w, http.StatusInternalServerError, "failed to re-initialize database: "+err.Error())
		return
	}

	response.JSON(w, http.StatusOK, map[string]string{
		"path": req.Path,
		"status": "updated",
	})
}