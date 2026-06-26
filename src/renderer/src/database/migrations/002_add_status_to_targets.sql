-- Migration: Add status and last_used_at columns to targets table
-- Version: 002
-- Description: Add status field (stored/staged/active) and last_used_at timestamp

-- Add status column with default 'stored'
ALTER TABLE targets ADD COLUMN status TEXT DEFAULT 'stored';

-- Add last_used_at column
ALTER TABLE targets ADD COLUMN last_used_at INTEGER;

-- Update existing records to have status = 'stored' (already default)
-- No additional updates needed

-- Create index for status queries
CREATE INDEX IF NOT EXISTS idx_targets_status ON targets(status);