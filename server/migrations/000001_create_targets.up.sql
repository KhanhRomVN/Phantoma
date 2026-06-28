CREATE TABLE IF NOT EXISTS targets (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    url TEXT,
    icon TEXT,
    platform TEXT,
    last_used_at INTEGER,
    executable_path TEXT,
    startup_args TEXT,
    environment TEXT,
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_targets_platform ON targets(platform);
CREATE INDEX IF NOT EXISTS idx_targets_updated_at ON targets(updated_at);
CREATE INDEX IF NOT EXISTS idx_targets_last_used ON targets(last_used_at);