/**
 * ------------------------------------------------------------------
 * Project API Types
 * ------------------------------------------------------------------
 * Kiểu dữ liệu project và worktree của Code server.
 *
 * Main types:
 * - CodeProject / CodeProjectInput   : Project và input tạo/cập nhật
 * - CodeWorktree / CodeWorktreeInput : Worktree và input tạo/cập nhật
 * ------------------------------------------------------------------
 */

// ─── Imports ─────────────────────────────────────────────────────────────────
// ── Types ──
import type { CodeSession } from './session.types';

// ─── Types ───────────────────────────────────────────────────────────────────
export interface CodeWorktree {
  id: string;
  projectId: string;
  path: string;
  branch: string;
  visible: boolean;
  searchTerm: string;
  session?: CodeSession | null;
}

export interface CodeProject {
  id: string;
  logo: string | null;
  name: string;
  repositoryUrl?: string | null;
  groupId?: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  worktrees: CodeWorktree[];
}

export type CodeWorktreeInput = Partial<
  Pick<CodeWorktree, 'path' | 'branch' | 'visible' | 'searchTerm'>
>;

export interface CodeProjectInput {
  id?: string;
  name?: string;
  logo?: string | null;
  repositoryUrl?: string | null;
  groupId?: string | null;
  sortOrder?: number;
  worktrees?: CodeWorktreeInput[];
}