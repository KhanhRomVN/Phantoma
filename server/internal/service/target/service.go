package target

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/phantoma/server/internal/database"
	domaintargets "github.com/phantoma/server/internal/domain/targets"
)

// Service xử lý business logic cho targets.
type Service struct{}

// NewService tạo một Target service mới.
func NewService() *Service {
	return &Service{}
}

// GetAll trả về tất cả targets, sắp xếp theo updated_at DESC.
func (s *Service) GetAll() ([]domaintargets.Target, error) {
	rows, err := database.DB.Query(
		`SELECT id, title, url, icon, platform, last_used_at,
		        executable_path, startup_args, environment,
		        created_at, updated_at
		 FROM targets ORDER BY updated_at DESC`,
	)
	if err != nil {
		return nil, fmt.Errorf("query targets: %w", err)
	}
	defer rows.Close()

	var targets []domaintargets.Target
	for rows.Next() {
		var t domaintargets.Target
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
		targets = []domaintargets.Target{}
	}
	return targets, rows.Err()
}

// GetByID trả về target theo ID.
func (s *Service) GetByID(id string) (*domaintargets.Target, error) {
	var t domaintargets.Target
	err := database.DB.QueryRow(
		`SELECT id, title, url, icon, platform, last_used_at,
		        executable_path, startup_args, environment,
		        created_at, updated_at
		 FROM targets WHERE id = ?`, id,
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

// Create tạo một target mới.
func (s *Service) Create(input domaintargets.CreateTargetInput) (*domaintargets.Target, error) {
	now := time.Now().Unix()

	id := input.ID
	if id == nil || *id == "" {
		uid := generateID()
		id = &uid
	}

	_, err := database.DB.Exec(
		`INSERT INTO targets (id, title, url, icon, platform,
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

	return s.GetByID(*id)
}

// Update cập nhật target theo ID.
func (s *Service) Update(id string, input domaintargets.UpdateTargetInput) (*domaintargets.Target, error) {
	now := time.Now().Unix()

	// Build dynamic UPDATE query
	query := "UPDATE targets SET updated_at = ?"
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

	return s.GetByID(id)
}

// Delete xóa target theo ID.
func (s *Service) Delete(id string) (bool, error) {
	result, err := database.DB.Exec("DELETE FROM targets WHERE id = ?", id)
	if err != nil {
		return false, fmt.Errorf("delete target: %w", err)
	}
	rowsAffected, _ := result.RowsAffected()
	return rowsAffected > 0, nil
}

// generateID tạo ID ngẫu nhiên đơn giản.
func generateID() string {
	return fmt.Sprintf("%x", time.Now().UnixNano())
}