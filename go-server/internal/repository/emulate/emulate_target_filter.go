package emulate

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/phantoma/server/internal/database"
	domainemulate "github.com/phantoma/server/internal/domain/emulate"
)

// FilterRepository defines the interface for emulate target filter data access.
type FilterRepository interface {
	GetByTargetID(targetID string) (*domainemulate.TargetFilter, error)
	Create(input domainemulate.CreateTargetFilterInput) (*domainemulate.TargetFilter, error)
	Update(id string, input domainemulate.UpdateTargetFilterInput) (*domainemulate.TargetFilter, error)
	Delete(id string) (bool, error)
	Upsert(targetID string, input domainemulate.CreateTargetFilterInput) (*domainemulate.TargetFilter, error)
}

// SQLiteFilterRepository implements FilterRepository using SQLite.
type SQLiteFilterRepository struct{}

// NewFilterRepository creates a new filter repository instance.
func NewFilterRepository() FilterRepository {
	return &SQLiteFilterRepository{}
}

// GetByTargetID returns the filter for a given target.
func (r *SQLiteFilterRepository) GetByTargetID(targetID string) (*domainemulate.TargetFilter, error) {
	var f domainemulate.TargetFilter
	err := database.DB.QueryRow(
		`SELECT id, emulate_target_id, method, host, status, type
		 FROM emulate_target_filters WHERE emulate_target_id = ?`, targetID,
	).Scan(&f.ID, &f.EmulateTargetID, &f.Method, &f.Host, &f.Status, &f.Type)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("query target filter: %w", err)
	}
	return &f, nil
}

// Create creates a new filter.
func (r *SQLiteFilterRepository) Create(input domainemulate.CreateTargetFilterInput) (*domainemulate.TargetFilter, error) {
	id := fmt.Sprintf("%x", time.Now().UnixNano())

	_, err := database.DB.Exec(
		`INSERT INTO emulate_target_filters (id, emulate_target_id, method, host, status, type)
		 VALUES (?, ?, ?, ?, ?, ?)`,
		id, input.EmulateTargetID, input.Method, input.Host, input.Status, input.Type,
	)
	if err != nil {
		return nil, fmt.Errorf("insert target filter: %w", err)
	}

	return r.GetByTargetID(input.EmulateTargetID)
}

// Update updates a filter by ID.
func (r *SQLiteFilterRepository) Update(id string, input domainemulate.UpdateTargetFilterInput) (*domainemulate.TargetFilter, error) {
	query := "UPDATE emulate_target_filters SET "
	args := []interface{}{}
	first := true

	if input.Method != nil {
		if !first { query += ", " }
		query += "method = ?"
		args = append(args, *input.Method)
		first = false
	}
	if input.Host != nil {
		if !first { query += ", " }
		query += "host = ?"
		args = append(args, *input.Host)
		first = false
	}
	if input.Status != nil {
		if !first { query += ", " }
		query += "status = ?"
		args = append(args, *input.Status)
		first = false
	}
	if input.Type != nil {
		if !first { query += ", " }
		query += "type = ?"
		args = append(args, *input.Type)
		first = false
	}

	if first {
		// Nothing to update
		return r.getByID(id)
	}

	query += " WHERE id = ?"
	args = append(args, id)

	_, err := database.DB.Exec(query, args...)
	if err != nil {
		return nil, fmt.Errorf("update target filter: %w", err)
	}

	return r.getByID(id)
}

// Delete deletes a filter by ID.
func (r *SQLiteFilterRepository) Delete(id string) (bool, error) {
	result, err := database.DB.Exec("DELETE FROM emulate_target_filters WHERE id = ?", id)
	if err != nil {
		return false, fmt.Errorf("delete target filter: %w", err)
	}
	rowsAffected, _ := result.RowsAffected()
	return rowsAffected > 0, nil
}

// Upsert creates or replaces a filter for a target (one filter per target).
func (r *SQLiteFilterRepository) Upsert(targetID string, input domainemulate.CreateTargetFilterInput) (*domainemulate.TargetFilter, error) {
	existing, err := r.GetByTargetID(targetID)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		updateInput := domainemulate.UpdateTargetFilterInput{
			Method: &input.Method,
			Host:   &input.Host,
			Status: &input.Status,
			Type:   &input.Type,
		}
		return r.Update(existing.ID, updateInput)
	}
	return r.Create(input)
}

// getByID returns a filter by its own ID.
func (r *SQLiteFilterRepository) getByID(id string) (*domainemulate.TargetFilter, error) {
	var f domainemulate.TargetFilter
	err := database.DB.QueryRow(
		`SELECT id, emulate_target_id, method, host, status, type
		 FROM emulate_target_filters WHERE id = ?`, id,
	).Scan(&f.ID, &f.EmulateTargetID, &f.Method, &f.Host, &f.Status, &f.Type)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("query filter by id: %w", err)
	}
	return &f, nil
}