CREATE TABLE IF NOT EXISTS emulate_target_filters (
    id TEXT PRIMARY KEY,
    emulate_target_id TEXT NOT NULL,
    method TEXT,
    host TEXT,
    status TEXT,
    type TEXT,
    FOREIGN KEY (emulate_target_id) REFERENCES emulate_targets(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_emulate_target_filters_target_id ON emulate_target_filters(emulate_target_id);