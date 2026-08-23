package database

import (
	"database/sql"
	_ "embed"
	"fmt"
	"strings"

	"github.com/phantoma/server/pkg/logger"
)

//go:embed migrations/migratie.sql
var migrationSQL string

// AutoMigrate runs database migrations automatically on startup
func AutoMigrate(db *sql.DB) error {
	logger.Info("[Migration] Starting auto-migration...")

	// Check current schema version
	var version int
	if err := db.QueryRow("PRAGMA user_version").Scan(&version); err != nil {
		logger.Error("[Migration] Failed to get current version", logger.F("error", err))
		return fmt.Errorf("failed to get current version: %w", err)
	}
	logger.Info("[Migration] Current version", logger.F("version", version))

	// If already at latest version, skip
	if version >= 1 {
		logger.Info("[Migration] Schema already up to date")
		return nil
	}

	// Run migration — split into individual statements (SQLite driver doesn't support multi-statements)
	logger.Info("[Migration] Running migration...")
	for _, stmt := range strings.Split(migrationSQL, ";") {
		stmt = strings.TrimSpace(stmt)
		if stmt == "" {
			continue
		}
		if _, err := db.Exec(stmt); err != nil {
			logger.Error("[Migration] Failed to run migration", logger.F("error", err))
			return fmt.Errorf("failed to run migration: %w", err)
		}
	}

	// Set version to 1
	if _, err := db.Exec("PRAGMA user_version = 1"); err != nil {
		logger.Error("[Migration] Failed to set version", logger.F("error", err))
		return fmt.Errorf("failed to set version: %w", err)
	}

	logger.Info("[Migration] Auto-migration completed successfully", logger.F("version", 1))
	return nil
}