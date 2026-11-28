/**
 * ------------------------------------------------------------------
 * Task API Types
 * ------------------------------------------------------------------
 * Kiểu dữ liệu task của Code server.
 *
 * Main types:
 * - CodeTask            : Task đầy đủ
 * - CodeTaskInput       : Input tạo task
 * - CodeTaskUpdateInput : Input cập nhật task
 * ------------------------------------------------------------------
 */

// ─── Types ───────────────────────────────────────────────────────────────────
export interface CodeTask {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: 'todo' | 'progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  sessionId: string | null;
  branchName: string | null;
  startDate: number | null;
  startTime: string | null;
  endDate: number | null;
  endTime: string | null;
  archived: boolean;
  workflowId: string | null;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
  tags: Array<{ id: string; label: string; color: string }>;
  checklist: Array<{ id: string; text: string; done: boolean }>;
  attachments: Array<{ path: string; kind: 'file' | 'folder' }>;
  dependsOn: string[];
}

export interface CodeTaskInput {
  title: string;
  description?: string;
  status?: 'todo' | 'progress' | 'done';
  priority?: 'low' | 'medium' | 'high';
  sessionId?: string | null;
  branchName?: string | null;
  startDate?: number | null;
  startTime?: string | null;
  endDate?: number | null;
  endTime?: string | null;
  tags?: Array<{ id?: string; label: string; color: string }>;
  checklist?: Array<{ id?: string; text: string; done: boolean }>;
  attachments?: Array<{ path: string; kind: 'file' | 'folder' }>;
  dependsOn?: string[];
}

export interface CodeTaskUpdateInput extends Partial<CodeTaskInput> {
  archived?: boolean;
  workflowId?: string | null;
  sortOrder?: number;
}