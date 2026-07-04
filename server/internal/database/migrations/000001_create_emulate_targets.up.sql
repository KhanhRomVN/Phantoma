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
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_emulate_targets_platform ON emulate_targets(platform);
CREATE INDEX IF NOT EXISTS idx_emulate_targets_updated_at ON emulate_targets(updated_at);
CREATE INDEX IF NOT EXISTS idx_emulate_targets_last_used ON emulate_targets(last_used_at);