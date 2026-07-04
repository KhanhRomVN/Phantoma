package database

import (
	"database/sql"
	"embed"
	"fmt"
	"io/fs"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/sqlite3"
	"github.com/golang-migrate/migrate/v4/source/iofs"
)

//go:embed migrations/*.sql
var migrationFiles embed.FS

// AutoMigrate runs database migrations automatically on startup
func AutoMigrate(db *sql.DB) error {
	// Create migrations directory in memory
	migrationFS, err := fs.Sub(migrationFiles, "migrations")
	if err != nil {
		return fmt.Errorf("failed to get migrations sub-fs: %w", err)
	}

	// Create source driver from embedded files
	sourceDriver, err := iofs.New(migrationFS, ".")
	if err != nil {
		return fmt.Errorf("failed to create source driver: %w", err)
	}

	// Create database driver
	dbDriver, err := sqlite3.WithInstance(db, &sqlite3.Config{})
	if err != nil {
		return fmt.Errorf("failed to create database driver: %w", err)
	}

	// Create migrate instance
	m, err := migrate.NewWithInstance("iofs", sourceDriver, "sqlite3", dbDriver)
	if err != nil {
		return fmt.Errorf("failed to create migrate instance: %w", err)
	}

	// Run migrations
	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	return nil
}