package target

import (
	"time"

	domaintargets "github.com/phantoma/server/internal/domain/targets"
	"github.com/phantoma/server/internal/repository"
)

// Service xử lý business logic cho targets.
type Service struct {
	repo repository.TargetRepository
}

// NewService tạo một Target service mới với repository.
func NewService(repo repository.TargetRepository) *Service {
	return &Service{repo: repo}
}

// GetAll trả về tất cả targets, sắp xếp theo updated_at DESC.
func (s *Service) GetAll() ([]domaintargets.Target, error) {
	return s.repo.GetAll()
}

// GetByID trả về target theo ID.
func (s *Service) GetByID(id string) (*domaintargets.Target, error) {
	return s.repo.GetByID(id)
}

// Create tạo một target mới.
func (s *Service) Create(input domaintargets.CreateTargetInput) (*domaintargets.Target, error) {
	now := time.Now().Unix()
	return s.repo.Create(input, now)
}

// Update cập nhật target theo ID.
func (s *Service) Update(id string, input domaintargets.UpdateTargetInput) (*domaintargets.Target, error) {
	now := time.Now().Unix()
	return s.repo.Update(id, input, now)
}

// Delete xóa target theo ID.
func (s *Service) Delete(id string) (bool, error) {
	return s.repo.Delete(id)
}

// UpdateLastUsed cập nhật last_used_at của target.
func (s *Service) UpdateLastUsed(id string) error {
	now := time.Now().Unix()
	return s.repo.UpdateLastUsed(id, now)
}