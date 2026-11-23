/**
 * ------------------------------------------------------------------
 * Workspace Types
 * ------------------------------------------------------------------
 * Định nghĩa các type cho workspace-related data.
 *
 * Main types:
 * - WorkspaceItem : File hoặc folder trong workspace
 * - Rule          : User-defined rule trong system prompt
 * ------------------------------------------------------------------
 */

// ─── Types ──────────────────────────────────────────────────────────────
/** A file or folder in the workspace. */
export interface WorkspaceItem {
  path: string;
  type: 'file' | 'folder';
  lastModified?: number;
  size?: number;
}

/** A user-defined rule injected into the system prompt. */
export interface Rule {
  id: string;
  name: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}
