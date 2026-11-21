-- ============================================
-- 0003: drop legacy repeater tables (replaced by fuzzer JSON files)
--       and remove legacy 'android' targets
-- Old repeater data is intentionally discarded.
-- ============================================

DROP TABLE IF EXISTS emulate_repeater_history_runs;
DROP TABLE IF EXISTS emulate_repeater_history;
DROP TABLE IF EXISTS emulate_repeater_payloads;
DROP TABLE IF EXISTS emulate_repeater_requests;

DELETE FROM target_http_filters WHERE target_id IN (SELECT id FROM targets WHERE platform = 'android');
DELETE FROM targets WHERE platform = 'android';