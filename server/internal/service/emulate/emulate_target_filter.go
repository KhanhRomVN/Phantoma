package emulate

import (
	domainemulate "github.com/phantoma/server/internal/domain/emulate"
	repoemulate "github.com/phantoma/server/internal/repository/emulate"
)

// FilterService xử lý business logic cho emulate target filters.
type FilterService struct {
	repo repoemulate.FilterRepository
}

// NewFilterService tạo một Filter service mới với repository.
func NewFilterService(repo repoemulate.FilterRepository) *FilterService {
	return &FilterService{repo: repo}
}

// GetByTargetID trả về filter cho target.
func (s *FilterService) GetByTargetID(targetID string) (*domainemulate.TargetFilter, error) {
	return s.repo.GetByTargetID(targetID)
}

// CreateOrUpdate tạo mới hoặc cập nhật filter cho target (mỗi lần thao tác đều gọi API).
func (s *FilterService) CreateOrUpdate(targetID string, input domainemulate.CreateTargetFilterInput) (*domainemulate.TargetFilter, error) {
	return s.repo.Upsert(targetID, input)
}

// Delete xóa filter theo ID.
func (s *FilterService) Delete(id string) (bool, error) {
	return s.repo.Delete(id)
}