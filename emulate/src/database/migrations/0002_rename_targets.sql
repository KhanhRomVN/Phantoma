-- ============================================
-- 0002: rename emulate_targets -> targets,
--       emulate_target_filters -> target_http_filters,
--       platform values web/pc/cli -> website/application/terminal
-- ('android' is kept as a legacy value, never rewritten or deleted)
-- ============================================

-- ── targets ──
ALTER TABLE emulate_targets RENAME TO targets;
DROP INDEX IF EXISTS idx_emulate_targets_updated;
CREATE INDEX IF NOT EXISTS idx_targets_updated ON targets(updated_at);

UPDATE targets
SET platform = CASE platform
    WHEN 'web' THEN 'website'
    WHEN 'pc'  THEN 'application'
    WHEN 'cli' THEN 'terminal'
    ELSE platform
END
WHERE platform IN ('web', 'pc', 'cli');

-- ── target_http_filters ──
ALTER TABLE emulate_target_filters RENAME TO target_http_filters;
ALTER TABLE target_http_filters RENAME COLUMN emulate_target_id TO target_id;
DROP INDEX IF EXISTS idx_emulate_target_filters_target;
CREATE UNIQUE INDEX IF NOT EXISTS idx_target_http_filters_target ON target_http_filters(target_id);