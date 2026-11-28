/**
 * ------------------------------------------------------------------
 * Workflow API Types
 * ------------------------------------------------------------------
 * Kiểu dữ liệu workflow của Code server.
 *
 * Main types:
 * - CodeWorkflow : Workflow gắn với một task
 * ------------------------------------------------------------------
 */

// ─── Types ───────────────────────────────────────────────────────────────────
export interface CodeWorkflow {
  id: string;
  taskId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}