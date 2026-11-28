/**
 * ------------------------------------------------------------------
 * Task Service Barrel
 * ------------------------------------------------------------------
 * Re-export task service, tiện ích lịch trình và dialog service từ một
 * điểm chung để các module khác import thống nhất.
 *
 * Main exports:
 * - features/tasks/services/task.service : Service quản lý task
 * - features/tasks/utils/schedule.util   : Tiện ích lịch trình task
 * - dialog.service                       : Service hộp thoại chọn đường dẫn
 * ------------------------------------------------------------------
 */

// ─── Exports ─────────────────────────────────────────────────────────────────
export * from '../../features/tasks/services/task.service';
export * from '../../features/tasks/utils/schedule.util';
export * from './dialog.service';