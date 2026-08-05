-- emulate_repeater_requests: store request configuration (method, url, body, params, headers)
CREATE TABLE IF NOT EXISTS emulate_repeater_requests (
    id TEXT PRIMARY KEY,
    emulate_target_id TEXT NOT NULL REFERENCES emulate_targets(id),
    method TEXT NOT NULL DEFAULT 'GET',
    url TEXT NOT NULL,
    body TEXT DEFAULT '',
    params TEXT DEFAULT '[]',
    headers TEXT DEFAULT '[]',
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_emulate_repeater_requests_target ON emulate_repeater_requests(emulate_target_id);
CREATE INDEX IF NOT EXISTS idx_emulate_repeater_requests_updated ON emulate_repeater_requests(updated_at);

-- emulate_repeater_payloads: store payload definitions, identified by variable name
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

-- emulate_repeater_history: store history of each batch run
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
CREATE INDEX IF NOT EXISTS idx_emulate_repeater_history_timestamp ON emulate_repeater_history(timestamp);

-- emulate_repeater_history_runs: store detailed results of each payload run
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