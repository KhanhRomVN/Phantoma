/**
 * ------------------------------------------------------------------
 * Revert Types
 * ------------------------------------------------------------------
 * Kiểu dữ liệu cho revert preview — danh sách file sẽ bị thay đổi
 * khi user revert conversation về một message cụ thể.
 * ------------------------------------------------------------------
 */

export type RevertGroupKey = 'restore' | 'undo' | 'remove';

export interface RevertFileEntry {
  filePath: string;
  actionType: string;
  additions: number;
  deletions: number;
}