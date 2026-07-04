package emulatetargets

import (
	"time"

	domainemulatetargets "github.com/phantoma/server/internal/domain/emulatetargets"
	"github.com/phantoma/server/internal/repository"
)

// Service xử lý business logic cho emulate targets.
type Service struct {
	repo repository.EmulateTargetRepository
}

// NewService tạo một Target service mới với repository.
func NewService(repo repository.EmulateTargetRepository) *Service {
	return &Service{repo: repo}
}

// GetAll trả về tất cả targets, sắp xếp theo updated_at DESC.
func (s *Service) GetAll() ([]domainemulatetargets.Target, error) {
	return s.repo.GetAll()
}

// GetByID trả về target theo ID.
func (s *Service) GetByID(id string) (*domainemulatetargets.Target, error) {
	return s.repo.GetByID(id)
}

// Create tạo một target mới.
func (s *Service) Create(input domainemulatetargets.CreateTargetInput) (*domainemulatetargets.Target, error) {
	now := time.Now().Unix()
	return s.repo.Create(input, now)
}

// Update cập nhật target theo ID.
func (s *Service) Update(id string, input domainemulatetargets.UpdateTargetInput) (*domainemulatetargets.Target, error) {
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