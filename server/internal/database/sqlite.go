// Package database cung cấp kết nối SQLite và chạy migration tự động.
package database

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/sqlite3"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	_ "github.com/mattn/go-sqlite3"
	"github.com/phantoma/server/pkg/logger"
)

// DB là instance database toàn cục.
var DB *sql.DB
var currentDBPath string

// Init mở kết nối SQLite và chạy migration.
// Trả về error nếu có lỗi xảy ra.
func Init(dbPath string) error {
	// Đảm bảo thư mục cha tồn tại
	dir := filepath.Dir(dbPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create database directory: %w", err)
	}

	// Mở kết nối SQLite
	db, err := sql.Open("sqlite3", dbPath+"?_journal_mode=WAL&_foreign_keys=on")
	if err != nil {
		return fmt.Errorf("failed to open database: %w", err)
	}

	// Kiểm tra kết nối
	if err := db.Ping(); err != nil {
		db.Close()
		return fmt.Errorf("failed to ping database: %w", err)
	}

	DB = db
	currentDBPath = dbPath
	logger.Info("database connected", logger.F("path", dbPath))

	// Chạy migration
	if err := runMigrations(dbPath); err != nil {
		db.Close()
		return fmt.Errorf("migration failed: %w", err)
	}

	return nil
}

// ReInit đóng kết nối database hiện tại và mở kết nối mới với dbPath mới.
// Trả về error nếu có lỗi xảy ra.
func ReInit(newPath string) error {
	// Đóng kết nối cũ nếu có
	if DB != nil {
		if err := DB.Close(); err != nil {
			logger.Warn("failed to close old database connection", logger.F("error", err))
		}
		DB = nil
	}

	// Mở kết nối mới
	if err := Init(newPath); err != nil {
		return fmt.Errorf("failed to re-initialize database: %w", err)
	}

	logger.Info("database re-initialized", logger.F("new_path", newPath))
	return nil
}

// GetCurrentPath trả về đường dẫn database hiện tại.
func GetCurrentPath() string {
	return currentDBPath
}

// Close đóng kết nối database.
func Close() {
	if DB != nil {
		DB.Close()
		logger.Info("database connection closed")
	}
}

// runMigrations chạy các file migration từ thư mục migrations/.
func runMigrations(dbPath string) error {
	// Lấy đường dẫn tuyệt đối đến thư mục migrations
	migrationsDir, err := filepath.Abs("migrations")
	if err != nil {
		return fmt.Errorf("failed to resolve migrations directory: %w", err)
	}

	// Tạo migrate instance
	m, err := migrate.New(
		"file://"+migrationsDir,
		"sqlite3://"+dbPath,
	)
	if err != nil {
		return fmt.Errorf("failed to create migrate instance: %w", err)
	}
	defer m.Close()

	// Chạy migration
	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("migration up failed: %w", err)
	}

	logger.Info("database migrations applied successfully")
	return nil
}