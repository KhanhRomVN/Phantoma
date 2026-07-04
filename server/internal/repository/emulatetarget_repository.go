package repository

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/phantoma/server/internal/database"
	domainemulatetargets "github.com/phantoma/server/internal/domain/emulatetargets"
)

// EmulateTargetRepository defines the interface for emulate target data access.
type EmulateTargetRepository interface {
	GetAll() ([]domainemulatetargets.Target, error)
	GetByID(id string) (*domainemulatetargets.Target, error)
	Create(input domainemulatetargets.CreateTargetInput, now int64) (*domainemulatetargets.Target, error)
	Update(id string, input domainemulatetargets.UpdateTargetInput, now int64) (*domainemulatetargets.Target, error)
	Delete(id string) (bool, error)
	UpdateLastUsed(id string, timestamp int64) error
}

// SQLiteEmulateTargetRepository implements EmulateTargetRepository using SQLite.
type SQLiteEmulateTargetRepository struct{}

// NewEmulateTargetRepository creates a new repository instance.
func NewEmulateTargetRepository() EmulateTargetRepository {
	return &SQLiteEmulateTargetRepository{}
}

// GetAll returns all emulate targets sorted by updated_at DESC.
func (r *SQLiteEmulateTargetRepository) GetAll() ([]domainemulatetargets.Target, error) {
	rows, err := database.DB.Query(
		`SELECT id, title, url, icon, platform, last_used_at,
		        executable_path, startup_args, environment,
		        created_at, updated_at
		 FROM emulate_targets ORDER BY updated_at DESC`,
	)
	if err != nil {
		return nil, fmt.Errorf("query emulate targets: %w", err)
	}
	defer rows.Close()

	var targets []domainemulatetargets.Target
	for rows.Next() {
		var t domainemulatetargets.Target
		if err := rows.Scan(
			&t.ID, &t.Title, &t.URL, &t.Icon, &t.Platform, &t.LastUsedAt,
			&t.ExecutablePath, &t.StartupArgs, &t.Environment,
			&t.CreatedAt, &t.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan target: %w", err)
		}
		targets = append(targets, t)
	}

	if targets == nil {
		targets = []domainemulatetargets.Target{}
	}
	return targets, rows.Err()
}

// GetByID returns a target by ID.
func (r *SQLiteEmulateTargetRepository) GetByID(id string) (*domainemulatetargets.Target, error) {
	var t domainemulatetargets.Target
	err := database.DB.QueryRow(
		`SELECT id, title, url, icon, platform, last_used_at,
		        executable_path, startup_args, environment,
		        created_at, updated_at
		 FROM emulate_targets WHERE id = ?`, id,
	).Scan(
		&t.ID, &t.Title, &t.URL, &t.Icon, &t.Platform, &t.LastUsedAt,
		&t.ExecutablePath, &t.StartupArgs, &t.Environment,
		&t.CreatedAt, &t.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("query target: %w", err)
	}
	return &t, nil
}

// Create creates a new target.
func (r *SQLiteEmulateTargetRepository) Create(input domainemulatetargets.CreateTargetInput, now int64) (*domainemulatetargets.Target, error) {
	id := input.ID
	if id == nil || *id == "" {
		uid := generateID()
		id = &uid
	}

	_, err := database.DB.Exec(
		`INSERT INTO emulate_targets (id, title, url, icon, platform,
		                      executable_path, startup_args, environment,
		                      created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		id, input.Title, input.URL, input.Icon, input.Platform,
		input.ExecutablePath, input.StartupArgs, input.Environment,
		now, now,
	)
	if err != nil {
		return nil, fmt.Errorf("insert target: %w", err)
	}

	return r.GetByID(*id)
}

// Update updates a target by ID.
func (r *SQLiteEmulateTargetRepository) Update(id string, input domainemulatetargets.UpdateTargetInput, now int64) (*domainemulatetargets.Target, error) {
	// Build dynamic UPDATE query
	query := "UPDATE emulate_targets SET updated_at = ?"
	args := []interface{}{now}

	if input.Title != nil {
		query += ", title = ?"
		args = append(args, *input.Title)
	}
	if input.URL != nil {
		query += ", url = ?"
		args = append(args, *input.URL)
	}
	if input.Icon != nil {
		query += ", icon = ?"
		args = append(args, *input.Icon)
	}
	if input.Platform != nil {
		query += ", platform = ?"
		args = append(args, *input.Platform)
	}
	if input.LastUsedAt != nil {
		query += ", last_used_at = ?"
		args = append(args, *input.LastUsedAt)
	}
	if input.ExecutablePath != nil {
		query += ", executable_path = ?"
		args = append(args, *input.ExecutablePath)
	}
	if input.StartupArgs != nil {
		query += ", startup_args = ?"
		args = append(args, *input.StartupArgs)
	}
	if input.Environment != nil {
		query += ", environment = ?"
		args = append(args, *input.Environment)
	}

	query += " WHERE id = ?"
	args = append(args, id)

	result, err := database.DB.Exec(query, args...)
	if err != nil {
		return nil, fmt.Errorf("update target: %w", err)
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return nil, nil
	}

	return r.GetByID(id)
}

// Delete deletes a target by ID.
func (r *SQLiteEmulateTargetRepository) Delete(id string) (bool, error) {
	result, err := database.DB.Exec("DELETE FROM emulate_targets WHERE id = ?", id)
	if err != nil {
		return false, fmt.Errorf("delete target: %w", err)
	}
	rowsAffected, _ := result.RowsAffected()
	return rowsAffected > 0, nil
}

// UpdateLastUsed updates only the last_used_at field for a target.
func (r *SQLiteEmulateTargetRepository) UpdateLastUsed(id string, timestamp int64) error {
	result, err := database.DB.Exec(
		"UPDATE emulate_targets SET last_used_at = ?, updated_at = ? WHERE id = ?",
		timestamp, timestamp, id,
	)
	if err != nil {
		return fmt.Errorf("update last_used_at: %w", err)
	}
	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return fmt.Errorf("target not found: %s", id)
	}
	return nil
}

// generateID tạo ID ngẫu nhiên đơn giản.
func generateID() string {
	return fmt.Sprintf("%x", time.Now().UnixNano())
}