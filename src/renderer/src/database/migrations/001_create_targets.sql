-- Migration: Create targets table
-- Version: 001
-- Description: Create table for storing target tabs

CREATE TABLE IF NOT EXISTS targets (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  favicon TEXT,
  url TEXT,
  platform TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_targets_platform ON targets(platform);
CREATE INDEX IF NOT EXISTS idx_targets_updated_at ON targets(updated_at);
CREATE INDEX IF NOT EXISTS idx_targets_title ON targets(title);

-- Example: Insert default target
-- INSERT INTO targets (id, title, favicon, url, platform) 
-- VALUES ('default', 'Default Target', NULL, NULL, 'web');