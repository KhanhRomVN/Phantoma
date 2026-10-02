package emulate

import (
	"time"

	domainemulate "github.com/phantoma/server/internal/domain/emulate"
	repoemulate "github.com/phantoma/server/internal/repository/emulate"
)

// RepeaterService xử lý business logic cho Repeater.
type RepeaterService struct {
	repo repoemulate.RepeaterRepository
}

// NewRepeaterService tạo Repeater service mới.
func NewRepeaterService(repo repoemulate.RepeaterRepository) *RepeaterService {
	return &RepeaterService{repo: repo}
}

// =============================================================================
// Requests
// =============================================================================

// GetRequestsByTarget trả về tất cả requests cho một target.
func (s *RepeaterService) GetRequestsByTarget(targetID string) ([]domainemulate.RepeaterRequest, error) {
	return s.repo.GetRequestsByTargetID(targetID)
}

// GetRequestByID trả về request theo ID.
func (s *RepeaterService) GetRequestByID(id string) (*domainemulate.RepeaterRequest, error) {
	return s.repo.GetRequestByID(id)
}

// CreateRequest tạo request mới.
func (s *RepeaterService) CreateRequest(input domainemulate.CreateRepeaterRequestInput) (*domainemulate.RepeaterRequest, error) {
	now := time.Now().Unix()
	return s.repo.CreateRequest(input, now)
}

// UpdateRequest cập nhật request.
func (s *RepeaterService) UpdateRequest(id string, input domainemulate.UpdateRepeaterRequestInput) (*domainemulate.RepeaterRequest, error) {
	now := time.Now().Unix()
	return s.repo.UpdateRequest(id, input, now)
}

// DeleteRequest xóa request.
func (s *RepeaterService) DeleteRequest(id string) (bool, error) {
	return s.repo.DeleteRequest(id)
}

// =============================================================================
// Payloads
// =============================================================================

// GetPayloadsByRequest trả về tất cả payloads cho một request.
func (s *RepeaterService) GetPayloadsByRequest(requestID string) ([]domainemulate.RepeaterPayload, error) {
	return s.repo.GetPayloadsByRequestID(requestID)
}

// CreateOrUpdatePayload tạo mới hoặc cập nhật payload (upsert theo request_id + name).
func (s *RepeaterService) CreateOrUpdatePayload(requestID string, input domainemulate.CreateRepeaterPayloadInput) (*domainemulate.RepeaterPayload, error) {
	now := time.Now().Unix()
	input.EmulateRepeaterRequestID = requestID
	return s.repo.UpsertPayload(requestID, input, now)
}

// DeletePayload xóa payload.
func (s *RepeaterService) DeletePayload(id string) (bool, error) {
	return s.repo.DeletePayload(id)
}

// =============================================================================
// History
// =============================================================================

// GetHistoryByTarget trả về lịch sử cho tất cả requests của target.
func (s *RepeaterService) GetHistoryByTarget(targetID string) ([]domainemulate.RepeaterHistory, error) {
	return s.repo.GetHistoryByTargetID(targetID)
}

// GetHistoryByRequest trả về lịch sử cho một request cụ thể.
func (s *RepeaterService) GetHistoryByRequest(requestID string) ([]domainemulate.RepeaterHistory, error) {
	return s.repo.GetHistoryByRequestID(requestID)
}

// SaveHistory lưu một history entry kèm tất cả runs.
func (s *RepeaterService) SaveHistory(
	historyInput domainemulate.CreateRepeaterHistoryInput,
	runsInput []domainemulate.CreateRepeaterHistoryRunInput,
) (*domainemulate.RepeaterHistory, error) {
	now := time.Now().Unix()
	history, err := s.repo.CreateHistory(historyInput, now)
	if err != nil {
		return nil, err
	}
	for _, runInput := range runsInput {
		runInput.HistoryID = history.ID
		if _, err := s.repo.CreateRun(runInput, now); err != nil {
			return nil, err
		}
	}
	return history, nil
}

// DeleteHistory xóa history entry (cascade runs).
func (s *RepeaterService) DeleteHistory(id string) (bool, error) {
	return s.repo.DeleteHistory(id)
}

// GetRunsByHistory trả về tất cả runs cho một history.
func (s *RepeaterService) GetRunsByHistory(historyID string) ([]domainemulate.RepeaterHistoryRun, error) {
	return s.repo.GetRunsByHistoryID(historyID)
}