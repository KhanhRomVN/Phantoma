package emulate

import (
	"time"

	domainemulate "github.com/phantoma/server/internal/domain/emulate"
	repoemulate "github.com/phantoma/server/internal/repository/emulate"
)

// TargetService xử lý business logic cho emulate targets.
type TargetService struct {
	repo repoemulate.TargetRepository
}

// NewTargetService tạo một Target service mới với repository.
func NewTargetService(repo repoemulate.TargetRepository) *TargetService {
	return &TargetService{repo: repo}
}

// GetAll trả về tất cả targets, sắp xếp theo updated_at DESC.
func (s *TargetService) GetAll() ([]domainemulate.Target, error) {
	return s.repo.GetAll()
}

// GetByID trả về target theo ID.
func (s *TargetService) GetByID(id string) (*domainemulate.Target, error) {
	return s.repo.GetByID(id)
}

// Create tạo một target mới.
func (s *TargetService) Create(input domainemulate.CreateTargetInput) (*domainemulate.Target, error) {
	now := time.Now().Unix()
	return s.repo.Create(input, now)
}

// Update cập nhật target theo ID.
func (s *TargetService) Update(id string, input domainemulate.UpdateTargetInput) (*domainemulate.Target, error) {
	now := time.Now().Unix()
	return s.repo.Update(id, input, now)
}

// Delete xóa target theo ID.
func (s *TargetService) Delete(id string) (bool, error) {
	return s.repo.Delete(id)
}

// UpdateLastUsed cập nhật last_used_at của target.
func (s *TargetService) UpdateLastUsed(id string) error {
	now := time.Now().Unix()
	return s.repo.UpdateLastUsed(id, now)
}