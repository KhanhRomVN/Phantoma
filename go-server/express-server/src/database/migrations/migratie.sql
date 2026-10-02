-- ============================================
-- Table: emulate_targets
-- ============================================
CREATE TABLE IF NOT EXISTS emulate_targets (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    url TEXT,
    icon TEXT,
    platform TEXT,
    last_used_at INTEGER,
    executable_path TEXT,
    startup_args TEXT,
    environment TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_emulate_targets_updated ON emulate_targets(updated_at);

-- ============================================
-- Drop legacy emulate_reports table (reports are file-based now)
-- ============================================
DROP TABLE IF EXISTS emulate_reports;

-- ============================================
-- Table: emulate_repeater_requests
-- ============================================
CREATE TABLE IF NOT EXISTS emulate_repeater_requests (
    id TEXT PRIMARY KEY,
    emulate_target_id TEXT NOT NULL REFERENCES emulate_targets(id),
    method TEXT NOT NULL DEFAULT 'GET',
    url TEXT NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_emulate_repeater_requests_target ON emulate_repeater_requests(emulate_target_id);
CREATE INDEX IF NOT EXISTS idx_emulate_repeater_requests_updated ON emulate_repeater_requests(updated_at);

-- ============================================
-- Table: emulate_repeater_payloads
-- ============================================
CREATE TABLE IF NOT EXISTS emulate_repeater_payloads (
    id TEXT PRIMARY KEY,
    emulate_repeater_request_id TEXT NOT NULL REFERENCES emulate_repeater_requests(id),
    name TEXT NOT NULL,
    payload_values TEXT NOT NULL DEFAULT '[]',
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_emulate_repeater_payloads_request ON emulate_repeater_payloads(emulate_repeater_request_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_emulate_repeater_payloads_name_request ON emulate_repeater_payloads(emulate_repeater_request_id, name);

-- ============================================
-- Table: emulate_repeater_history
-- ============================================
CREATE TABLE IF NOT EXISTS emulate_repeater_history (
    id TEXT PRIMARY KEY,
    emulate_repeater_request_id TEXT REFERENCES emulate_repeater_requests(id),
    method TEXT NOT NULL,
    url TEXT NOT NULL,
    status INTEGER,
    statuses TEXT DEFAULT '{}',
    timestamp INTEGER NOT NULL,
    end_time INTEGER,
    duration INTEGER DEFAULT 0,
    payload_count INTEGER DEFAULT 0,
    payload_summary TEXT DEFAULT '',
    request_headers TEXT DEFAULT '{}',
    request_body TEXT DEFAULT '',
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_emulate_repeater_history_request ON emulate_repeater_history(emulate_repeater_request_id);
CREATE INDEX IF NOT EXISTS idx_emulate_repeater_history_timestamp ON emulate_repeater_history(timestamp DESC);

-- ============================================
-- Table: emulate_repeater_history_runs
-- ============================================
CREATE TABLE IF NOT EXISTS emulate_repeater_history_runs (
    id TEXT PRIMARY KEY,
    history_id TEXT NOT NULL REFERENCES emulate_repeater_history(id) ON DELETE CASCADE,
    payload_name TEXT NOT NULL,
    payload_value TEXT NOT NULL,
    status INTEGER,
    duration INTEGER,
    method TEXT,
    url TEXT,
    params TEXT DEFAULT '{}',
    request_headers TEXT DEFAULT '{}',
    request_body TEXT DEFAULT '',
    response_headers TEXT DEFAULT '{}',
    response_body TEXT DEFAULT '',
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_emulate_repeater_history_runs_history ON emulate_repeater_history_runs(history_id);
CREATE INDEX IF NOT EXISTS idx_emulate_repeater_history_runs_payload ON emulate_repeater_history_runs(history_id, payload_name);