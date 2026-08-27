package emulate

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/phantoma/server/internal/database"
	domainemulate "github.com/phantoma/server/internal/domain/emulate"
)

// =============================================================================
// RepeaterRepository interface
// =============================================================================

// RepeaterRepository defines the interface for all repeater data access.
type RepeaterRepository interface {
	// Requests
	GetRequestsByTargetID(targetID string) ([]domainemulate.RepeaterRequest, error)
	GetRequestByID(id string) (*domainemulate.RepeaterRequest, error)
	CreateRequest(input domainemulate.CreateRepeaterRequestInput, now int64) (*domainemulate.RepeaterRequest, error)
	UpdateRequest(id string, input domainemulate.UpdateRepeaterRequestInput, now int64) (*domainemulate.RepeaterRequest, error)
	DeleteRequest(id string) (bool, error)

	// Payloads
	GetPayloadsByRequestID(requestID string) ([]domainemulate.RepeaterPayload, error)
	CreatePayload(input domainemulate.CreateRepeaterPayloadInput, now int64) (*domainemulate.RepeaterPayload, error)
	UpdatePayload(id string, input domainemulate.UpdateRepeaterPayloadInput, now int64) (*domainemulate.RepeaterPayload, error)
	DeletePayload(id string) (bool, error)
	UpsertPayload(requestID string, input domainemulate.CreateRepeaterPayloadInput, now int64) (*domainemulate.RepeaterPayload, error)

	// History
	GetHistoryByTargetID(targetID string) ([]domainemulate.RepeaterHistory, error)
	GetHistoryByRequestID(requestID string) ([]domainemulate.RepeaterHistory, error)
	CreateHistory(input domainemulate.CreateRepeaterHistoryInput, now int64) (*domainemulate.RepeaterHistory, error)
	DeleteHistory(id string) (bool, error)

	// History Runs
	GetRunsByHistoryID(historyID string) ([]domainemulate.RepeaterHistoryRun, error)
	CreateRun(input domainemulate.CreateRepeaterHistoryRunInput, now int64) (*domainemulate.RepeaterHistoryRun, error)
}

// =============================================================================
// SQLiteRepeaterRepository
// =============================================================================

// SQLiteRepeaterRepository implements RepeaterRepository using SQLite.
type SQLiteRepeaterRepository struct {
	fileStorage *RepeaterFileStorage
}

// NewRepeaterRepository creates a new repeater repository instance.
func NewRepeaterRepository() RepeaterRepository {
	return &SQLiteRepeaterRepository{
		fileStorage: NewRepeaterFileStorage(),
	}
}

// =============================================================================
// Request CRUD
// =============================================================================

// GetRequestsByTargetID returns all requests for a target, sorted by updated_at DESC.
func (r *SQLiteRepeaterRepository) GetRequestsByTargetID(targetID string) ([]domainemulate.RepeaterRequest, error) {
	rows, err := database.DB.Query(
		`SELECT id, emulate_target_id, method, url, body, params, headers, created_at, updated_at
		 FROM emulate_repeater_requests
		 WHERE emulate_target_id = ?
		 ORDER BY updated_at DESC`, targetID,
	)
	if err != nil {
		return nil, fmt.Errorf("query repeater requests: %w", err)
	}
	defer rows.Close()

	var requests []domainemulate.RepeaterRequest
	for rows.Next() {
		var req domainemulate.RepeaterRequest
		if err := rows.Scan(&req.ID, &req.EmulateTargetID, &req.Method, &req.URL,
			&req.Body, &req.Params, &req.Headers, &req.CreatedAt, &req.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan repeater request: %w", err)
		}

		// Read content from file system (already in JSON format)
		paramsJSON, _ := r.fileStorage.ReadParams(req.EmulateTargetID, req.ID)
		headersJSON, _ := r.fileStorage.ReadHeaders(req.EmulateTargetID, req.ID)
		bodyContent, _ := r.fileStorage.ReadBody(req.EmulateTargetID, req.ID)

		req.Params = paramsJSON
		req.Headers = headersJSON
		req.Body = bodyContent

		requests = append(requests, req)
	}
	if requests == nil {
		requests = []domainemulate.RepeaterRequest{}
	}
	return requests, rows.Err()
}

// GetRequestByID returns a request by ID.
func (r *SQLiteRepeaterRepository) GetRequestByID(id string) (*domainemulate.RepeaterRequest, error) {
	var req domainemulate.RepeaterRequest
	err := database.DB.QueryRow(
		`SELECT id, emulate_target_id, method, url, body, params, headers, created_at, updated_at
		 FROM emulate_repeater_requests WHERE id = ?`, id,
	).Scan(&req.ID, &req.EmulateTargetID, &req.Method, &req.URL,
		&req.Body, &req.Params, &req.Headers, &req.CreatedAt, &req.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("query repeater request: %w", err)
	}

	// Read content from file system (already in JSON format)
	paramsJSON, _ := r.fileStorage.ReadParams(req.EmulateTargetID, req.ID)
	headersJSON, _ := r.fileStorage.ReadHeaders(req.EmulateTargetID, req.ID)
	bodyContent, _ := r.fileStorage.ReadBody(req.EmulateTargetID, req.ID)

	req.Params = paramsJSON
	req.Headers = headersJSON
	req.Body = bodyContent

	return &req, nil
}

// CreateRequest creates a new request.
func (r *SQLiteRepeaterRepository) CreateRequest(input domainemulate.CreateRepeaterRequestInput, now int64) (*domainemulate.RepeaterRequest, error) {
	id := fmt.Sprintf("%x", time.Now().UnixNano())

	// Save JSON content directly to files
	if err := r.fileStorage.WriteParams(input.EmulateTargetID, id, input.Params); err != nil {
		return nil, fmt.Errorf("write params to file: %w", err)
	}
	if err := r.fileStorage.WriteHeaders(input.EmulateTargetID, id, input.Headers); err != nil {
		return nil, fmt.Errorf("write headers to file: %w", err)
	}
	if err := r.fileStorage.WriteBody(input.EmulateTargetID, id, input.Body); err != nil {
		return nil, fmt.Errorf("write body to file: %w", err)
	}

	// Save metadata to database (without params, headers, body content)
	_, err := database.DB.Exec(
		`INSERT INTO emulate_repeater_requests (id, emulate_target_id, method, url, body, params, headers, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		id, input.EmulateTargetID, input.Method, input.URL, "", "", "", now, now,
	)
	if err != nil {
		return nil, fmt.Errorf("insert repeater request: %w", err)
	}
	return r.GetRequestByID(id)
}

// UpdateRequest updates a request by ID.
func (r *SQLiteRepeaterRepository) UpdateRequest(id string, input domainemulate.UpdateRepeaterRequestInput, now int64) (*domainemulate.RepeaterRequest, error) {
	// Get current request to know targetID
	current, err := r.GetRequestByID(id)
	if current == nil {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	// Update files if content changed (write JSON directly)
	if input.Params != nil {
		if err := r.fileStorage.WriteParams(current.EmulateTargetID, id, *input.Params); err != nil {
			return nil, fmt.Errorf("write params to file: %w", err)
		}
	}
	if input.Headers != nil {
		if err := r.fileStorage.WriteHeaders(current.EmulateTargetID, id, *input.Headers); err != nil {
			return nil, fmt.Errorf("write headers to file: %w", err)
		}
	}
	if input.Body != nil {
		if err := r.fileStorage.WriteBody(current.EmulateTargetID, id, *input.Body); err != nil {
			return nil, fmt.Errorf("write body to file: %w", err)
		}
	}

	// Update metadata in database
	query := "UPDATE emulate_repeater_requests SET updated_at = ?"
	args := []interface{}{now}

	if input.Method != nil {
		query += ", method = ?"
		args = append(args, *input.Method)
	}
	if input.URL != nil {
		query += ", url = ?"
		args = append(args, *input.URL)
	}

	query += " WHERE id = ?"
	args = append(args, id)

	result, err := database.DB.Exec(query, args...)
	if err != nil {
		return nil, fmt.Errorf("update repeater request: %w", err)
	}
	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return nil, nil
	}
	return r.GetRequestByID(id)
}

// DeleteRequest deletes a request by ID.
func (r *SQLiteRepeaterRepository) DeleteRequest(id string) (bool, error) {
	// Get request to know targetID before deleting
	req, err := r.GetRequestByID(id)
	if err != nil {
		return false, err
	}
	if req == nil {
		return false, nil
	}

	// Delete files
	if err := r.fileStorage.DeleteAll(req.EmulateTargetID, id); err != nil {
		// Log error but continue with database deletion
		fmt.Printf("Warning: failed to delete files for repeater %s: %v\n", id, err)
	}

	// Delete from database
	result, err := database.DB.Exec("DELETE FROM emulate_repeater_requests WHERE id = ?", id)
	if err != nil {
		return false, fmt.Errorf("delete repeater request: %w", err)
	}
	rowsAffected, _ := result.RowsAffected()
	return rowsAffected > 0, nil
}

// =============================================================================
// Payload CRUD
// =============================================================================

// GetPayloadsByRequestID returns all payloads for a request.
func (r *SQLiteRepeaterRepository) GetPayloadsByRequestID(requestID string) ([]domainemulate.RepeaterPayload, error) {
	rows, err := database.DB.Query(
		`SELECT id, emulate_repeater_request_id, name, payload_values, enabled, created_at
		 FROM emulate_repeater_payloads
		 WHERE emulate_repeater_request_id = ?
		 ORDER BY created_at`, requestID,
	)
	if err != nil {
		return nil, fmt.Errorf("query repeater payloads: %w", err)
	}
	defer rows.Close()

	var payloads []domainemulate.RepeaterPayload
	for rows.Next() {
		var p domainemulate.RepeaterPayload
		if err := rows.Scan(&p.ID, &p.EmulateRepeaterRequestID, &p.Name, &p.PayloadValues, &p.Enabled, &p.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan repeater payload: %w", err)
		}
		payloads = append(payloads, p)
	}
	if payloads == nil {
		payloads = []domainemulate.RepeaterPayload{}
	}
	return payloads, rows.Err()
}

// CreatePayload creates a new payload.
func (r *SQLiteRepeaterRepository) CreatePayload(input domainemulate.CreateRepeaterPayloadInput, now int64) (*domainemulate.RepeaterPayload, error) {
	id := fmt.Sprintf("%x", time.Now().UnixNano())

	enabled := 1
	if input.Enabled != nil {
		enabled = *input.Enabled
	}

	payloadValues := input.PayloadValues
	if payloadValues == "" {
		payloadValues = "[]"
	}

	_, err := database.DB.Exec(
		`INSERT INTO emulate_repeater_payloads (id, emulate_repeater_request_id, name, payload_values, enabled, created_at)
		 VALUES (?, ?, ?, ?, ?, ?)`,
		id, input.EmulateRepeaterRequestID, input.Name, payloadValues, enabled, now,
	)
	if err != nil {
		return nil, fmt.Errorf("insert repeater payload: %w", err)
	}
	return r.getPayloadByID(id)
}

// UpdatePayload updates a payload by ID.
func (r *SQLiteRepeaterRepository) UpdatePayload(id string, input domainemulate.UpdateRepeaterPayloadInput, now int64) (*domainemulate.RepeaterPayload, error) {
	query := "UPDATE emulate_repeater_payloads SET "
	args := []interface{}{}
	first := true

	if input.PayloadValues != nil {
		if !first {
			query += ", "
		}
		query += "payload_values = ?"
		args = append(args, *input.PayloadValues)
		first = false
	}
	if input.Enabled != nil {
		if !first {
			query += ", "
		}
		query += "enabled = ?"
		args = append(args, *input.Enabled)
		first = false
	}

	if first {
		return r.getPayloadByID(id)
	}

	query += " WHERE id = ?"
	args = append(args, id)

	_, err := database.DB.Exec(query, args...)
	if err != nil {
		return nil, fmt.Errorf("update repeater payload: %w", err)
	}
	return r.getPayloadByID(id)
}

// DeletePayload deletes a payload by ID.
func (r *SQLiteRepeaterRepository) DeletePayload(id string) (bool, error) {
	result, err := database.DB.Exec("DELETE FROM emulate_repeater_payloads WHERE id = ?", id)
	if err != nil {
		return false, fmt.Errorf("delete repeater payload: %w", err)
	}
	rowsAffected, _ := result.RowsAffected()
	return rowsAffected > 0, nil
}

// UpsertPayload creates or replaces a payload for a request (one payload per variable name).
func (r *SQLiteRepeaterRepository) UpsertPayload(requestID string, input domainemulate.CreateRepeaterPayloadInput, now int64) (*domainemulate.RepeaterPayload, error) {
	var existingID string
	err := database.DB.QueryRow(
		`SELECT id FROM emulate_repeater_payloads
		 WHERE emulate_repeater_request_id = ? AND name = ?`,
		requestID, input.Name,
	).Scan(&existingID)
	if err == nil {
		updateInput := domainemulate.UpdateRepeaterPayloadInput{
			PayloadValues: &input.PayloadValues,
			Enabled:       input.Enabled,
		}
		return r.UpdatePayload(existingID, updateInput, now)
	}
	if err != sql.ErrNoRows {
		return nil, fmt.Errorf("query existing payload: %w", err)
	}
	return r.CreatePayload(input, now)
}

func (r *SQLiteRepeaterRepository) getPayloadByID(id string) (*domainemulate.RepeaterPayload, error) {
	var p domainemulate.RepeaterPayload
	err := database.DB.QueryRow(
		`SELECT id, emulate_repeater_request_id, name, payload_values, enabled, created_at
		 FROM emulate_repeater_payloads WHERE id = ?`, id,
	).Scan(&p.ID, &p.EmulateRepeaterRequestID, &p.Name, &p.PayloadValues, &p.Enabled, &p.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("query payload by id: %w", err)
	}
	return &p, nil
}

// =============================================================================
// History CRUD
// =============================================================================

// GetHistoryByTargetID returns all history for requests of a target.
func (r *SQLiteRepeaterRepository) GetHistoryByTargetID(targetID string) ([]domainemulate.RepeaterHistory, error) {
	rows, err := database.DB.Query(
		`SELECT h.id, h.emulate_repeater_request_id, h.method, h.url,
		        h.status, h.statuses, h.timestamp, h.end_time, h.duration,
		        h.payload_count, h.payload_summary, h.request_headers, h.request_body, h.created_at
		 FROM emulate_repeater_history h
		 JOIN emulate_repeater_requests req ON h.emulate_repeater_request_id = req.id
		 WHERE req.emulate_target_id = ?
		 ORDER BY h.timestamp DESC`, targetID,
	)
	if err != nil {
		return nil, fmt.Errorf("query repeater history by target: %w", err)
	}
	defer rows.Close()
	return scanHistoryRows(rows)
}

// GetHistoryByRequestID returns all history for a specific request.
func (r *SQLiteRepeaterRepository) GetHistoryByRequestID(requestID string) ([]domainemulate.RepeaterHistory, error) {
	rows, err := database.DB.Query(
		`SELECT id, emulate_repeater_request_id, method, url,
		        status, statuses, timestamp, end_time, duration,
		        payload_count, payload_summary, request_headers, request_body, created_at
		 FROM emulate_repeater_history
		 WHERE emulate_repeater_request_id = ?
		 ORDER BY timestamp DESC`, requestID,
	)
	if err != nil {
		return nil, fmt.Errorf("query repeater history by request: %w", err)
	}
	defer rows.Close()
	return scanHistoryRows(rows)
}

func scanHistoryRows(rows *sql.Rows) ([]domainemulate.RepeaterHistory, error) {
	var histories []domainemulate.RepeaterHistory
	for rows.Next() {
		var h domainemulate.RepeaterHistory
		if err := rows.Scan(
			&h.ID, &h.EmulateRepeaterRequestID, &h.Method, &h.URL,
			&h.Status, &h.Statuses, &h.Timestamp, &h.EndTime, &h.Duration,
			&h.PayloadCount, &h.PayloadSummary, &h.RequestHeaders, &h.RequestBody, &h.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan repeater history: %w", err)
		}
		histories = append(histories, h)
	}
	if histories == nil {
		histories = []domainemulate.RepeaterHistory{}
	}
	return histories, rows.Err()
}

// CreateHistory creates a new history entry.
func (r *SQLiteRepeaterRepository) CreateHistory(input domainemulate.CreateRepeaterHistoryInput, now int64) (*domainemulate.RepeaterHistory, error) {
	id := fmt.Sprintf("%x", time.Now().UnixNano())

	statuses := input.Statuses
	if statuses == "" {
		statuses = "{}"
	}
	requestHeaders := input.RequestHeaders
	if requestHeaders == "" {
		requestHeaders = "{}"
	}

	_, err := database.DB.Exec(
		`INSERT INTO emulate_repeater_history
		 (id, emulate_repeater_request_id, method, url, status, statuses,
		  timestamp, end_time, duration, payload_count, payload_summary,
		  request_headers, request_body, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		id, input.EmulateRepeaterRequestID, input.Method, input.URL,
		input.Status, statuses, input.Timestamp, input.EndTime, input.Duration,
		input.PayloadCount, input.PayloadSummary, requestHeaders, input.RequestBody, now,
	)
	if err != nil {
		return nil, fmt.Errorf("insert repeater history: %w", err)
	}
	return r.getHistoryByID(id)
}

// DeleteHistory deletes a history entry by ID (cascades to runs).
func (r *SQLiteRepeaterRepository) DeleteHistory(id string) (bool, error) {
	result, err := database.DB.Exec("DELETE FROM emulate_repeater_history WHERE id = ?", id)
	if err != nil {
		return false, fmt.Errorf("delete repeater history: %w", err)
	}
	rowsAffected, _ := result.RowsAffected()
	return rowsAffected > 0, nil
}

func (r *SQLiteRepeaterRepository) getHistoryByID(id string) (*domainemulate.RepeaterHistory, error) {
	var h domainemulate.RepeaterHistory
	err := database.DB.QueryRow(
		`SELECT id, emulate_repeater_request_id, method, url,
		        status, statuses, timestamp, end_time, duration,
		        payload_count, payload_summary, request_headers, request_body, created_at
		 FROM emulate_repeater_history WHERE id = ?`, id,
	).Scan(
		&h.ID, &h.EmulateRepeaterRequestID, &h.Method, &h.URL,
		&h.Status, &h.Statuses, &h.Timestamp, &h.EndTime, &h.Duration,
		&h.PayloadCount, &h.PayloadSummary, &h.RequestHeaders, &h.RequestBody, &h.CreatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("query history by id: %w", err)
	}
	return &h, nil
}

// =============================================================================
// History Runs CRUD
// =============================================================================

// GetRunsByHistoryID returns all runs for a history entry.
func (r *SQLiteRepeaterRepository) GetRunsByHistoryID(historyID string) ([]domainemulate.RepeaterHistoryRun, error) {
	rows, err := database.DB.Query(
		`SELECT id, history_id, payload_name, payload_value,
		        status, duration, method, url,
		        params, request_headers, request_body,
		        response_headers, response_body, created_at
		 FROM emulate_repeater_history_runs
		 WHERE history_id = ?
		 ORDER BY created_at`, historyID,
	)
	if err != nil {
		return nil, fmt.Errorf("query repeater history runs: %w", err)
	}
	defer rows.Close()

	var runs []domainemulate.RepeaterHistoryRun
	for rows.Next() {
		var run domainemulate.RepeaterHistoryRun
		if err := rows.Scan(
			&run.ID, &run.HistoryID, &run.PayloadName, &run.PayloadValue,
			&run.Status, &run.Duration, &run.Method, &run.URL,
			&run.Params, &run.RequestHeaders, &run.RequestBody,
			&run.ResponseHeaders, &run.ResponseBody, &run.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan repeater history run: %w", err)
		}
		runs = append(runs, run)
	}
	if runs == nil {
		runs = []domainemulate.RepeaterHistoryRun{}
	}
	return runs, rows.Err()
}

// CreateRun creates a new history run.
func (r *SQLiteRepeaterRepository) CreateRun(input domainemulate.CreateRepeaterHistoryRunInput, now int64) (*domainemulate.RepeaterHistoryRun, error) {
	id := fmt.Sprintf("%x", time.Now().UnixNano())

	params := input.Params
	if params == "" {
		params = "{}"
	}
	requestHeaders := input.RequestHeaders
	if requestHeaders == "" {
		requestHeaders = "{}"
	}
	responseHeaders := input.ResponseHeaders
	if responseHeaders == "" {
		responseHeaders = "{}"
	}

	_, err := database.DB.Exec(
		`INSERT INTO emulate_repeater_history_runs
		 (id, history_id, payload_name, payload_value,
		  status, duration, method, url,
		  params, request_headers, request_body,
		  response_headers, response_body, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		id, input.HistoryID, input.PayloadName, input.PayloadValue,
		input.Status, input.Duration, input.Method, input.URL,
		params, requestHeaders, input.RequestBody,
		responseHeaders, input.ResponseBody, now,
	)
	if err != nil {
		return nil, fmt.Errorf("insert repeater history run: %w", err)
	}
	return r.getRunByID(id)
}

func (r *SQLiteRepeaterRepository) getRunByID(id string) (*domainemulate.RepeaterHistoryRun, error) {
	var run domainemulate.RepeaterHistoryRun
	err := database.DB.QueryRow(
		`SELECT id, history_id, payload_name, payload_value,
		        status, duration, method, url,
		        params, request_headers, request_body,
		        response_headers, response_body, created_at
		 FROM emulate_repeater_history_runs WHERE id = ?`, id,
	).Scan(
		&run.ID, &run.HistoryID, &run.PayloadName, &run.PayloadValue,
		&run.Status, &run.Duration, &run.Method, &run.URL,
		&run.Params, &run.RequestHeaders, &run.RequestBody,
		&run.ResponseHeaders, &run.ResponseBody, &run.CreatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("query history run by id: %w", err)
	}
	return &run, nil
}
