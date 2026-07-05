package database

import (
	"database/sql"
	"embed"
	"fmt"
	"io/fs"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/sqlite3"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	"github.com/phantoma/server/pkg/logger"
)

//go:embed migrations/*.sql
var migrationFiles embed.FS

// AutoMigrate runs database migrations automatically on startup
func AutoMigrate(db *sql.DB) error {
	logger.Info("[Migration] Starting auto-migration...")

	// Create migrations directory in memory
	migrationFS, err := fs.Sub(migrationFiles, "migrations")
	if err != nil {
		logger.Error("[Migration] Failed to get migrations sub-fs", logger.F("error", err))
		return fmt.Errorf("failed to get migrations sub-fs: %w", err)
	}

	// Create source driver from embedded files
	sourceDriver, err := iofs.New(migrationFS, ".")
	if err != nil {
		logger.Error("[Migration] Failed to create source driver", logger.F("error", err))
		return fmt.Errorf("failed to create source driver: %w", err)
	}
	logger.Info("[Migration] Source driver created successfully")

	// Create database driver
	dbDriver, err := sqlite3.WithInstance(db, &sqlite3.Config{})
	if err != nil {
		logger.Error("[Migration] Failed to create database driver", logger.F("error", err))
		return fmt.Errorf("failed to create database driver: %w", err)
	}
	logger.Info("[Migration] Database driver created successfully")

	// Create migrate instance
	m, err := migrate.NewWithInstance("iofs", sourceDriver, "sqlite3", dbDriver)
	if err != nil {
		logger.Error("[Migration] Failed to create migrate instance", logger.F("error", err))
		return fmt.Errorf("failed to create migrate instance: %w", err)
	}
	logger.Info("[Migration] Migrate instance created")

	// Check current migration version
	version, dirty, err := m.Version()
	if err != nil && err != migrate.ErrNilVersion {
		logger.Error("[Migration] Failed to get current version", logger.F("error", err))
		return fmt.Errorf("failed to get current version: %w", err)
	}
	logger.Info("[Migration] Current version",
		logger.F("version", version),
		logger.F("dirty", dirty),
	)

	// Run migrations
	logger.Info("[Migration] Running migrations...")
	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		logger.Error("[Migration] Failed to run migrations", logger.F("error", err))
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	// Check final version
	finalVersion, _, _ := m.Version()
	logger.Info("[Migration] Auto-migration completed successfully",
		logger.F("from_version", version),
		logger.F("to_version", finalVersion),
	)

	return nil
}