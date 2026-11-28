/**
 * ------------------------------------------------------------------
 * Git API Types
 * ------------------------------------------------------------------
 * Kiểu dữ liệu cho các endpoint git của Code server (mirror
 * code/src/domain/api-types.ts).
 *
 * Main types:
 * - GitStatusResult                 : Kết quả git status
 * - GitErr                          : Thông tin lỗi chung
 * - GitLogCommit / GitLogResult     : Commit và kết quả git log
 * - GitChangedInOtherBranchesResult : File thay đổi ở branch khác
 * - GitRemoteDiffResult             : Danh sách file khác biệt với remote
 * ------------------------------------------------------------------
 */

// ─── Types ───────────────────────────────────────────────────────────────────
// Mirror of code/src/domain/api-types.ts (GitStatusResult = GitStatusPayload)
export interface GitStatusResult {
  files: Record<string, 'added' | 'modified' | 'deleted'>;
  output: string;
  diffStats: Record<string, { added: number; deleted: number }>;
  unpushedCommits: string[];
  committedFiles: string[];
  branch: string;
}

export interface GitErr {
  error?: string;
}

export interface GitLogCommit {
  hash: string;
  parents: string[];
  author: string;
  email: string;
  date: number;
  refs: string[];
  subject: string;
}

export type GitLogResult = { commits: GitLogCommit[] } & GitErr;

export interface GitChangedInOtherBranchesResult {
  files: Record<string, string[]>;
}

export interface GitRemoteDiffResult {
  files: Set<string>;
}