/**
 * ------------------------------------------------------------------
 * Task Tool Util
 * ------------------------------------------------------------------
 * Tiện ích dùng chung cho các executor tool task/workflow: validate và
 * parse status/priority/due_date, tóm tắt task và chạy handler với xử lý lỗi thống nhất.
 *
 * Main types:
 * - TaskToolParams  : Params thô của tool
 * - TaskToolHandler : Hàm xử lý nhận params và projectPath
 *
 * Main functions:
 * - compact()       : Loại bỏ field undefined khỏi object
 * - parseStatus()   : Validate status task
 * - parsePriority() : Validate priority task
 * - parseDueDate()  : Chuyển YYYY-MM-DD sang timestamp
 * - summarizeTask() : Tóm tắt task cho output
 * - detailTask()    : Chi tiết task cho output
 * - runTaskTool()   : Chạy handler, kiểm tra project và bắt lỗi
 * ------------------------------------------------------------------
 */

// ─── Imports ─────────────────────────────────────────────────────────────────
// ── Services ──
import type { StoredTask, TaskPriority, TaskStatus } from '../../../shared/services/task.service';

// ── Stores ──
import { useCodeStore } from '../../../shared/stores/code.store';

// ─── Constants ───────────────────────────────────────────────────────────────
const STATUSES: TaskStatus[] = ['todo', 'progress', 'done'];
const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high'];
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// ─── Types ───────────────────────────────────────────────────────────────────
export type TaskToolParams = Record<string, any>;
export type TaskToolHandler = (params: TaskToolParams, projectPath: string) => Promise<string>;

// ─── Functions ───────────────────────────────────────────────────────────────
const getProjectPath = (): string | null => {
  const state = useCodeStore.getState();
  return state.projects.find((p) => p.id === state.currentProjectId)?.path ?? null;
};

export const compact = <T extends object>(obj: T): T =>
  Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined)) as T;

export const parseStatus = (value?: string): TaskStatus | undefined => {
  if (value === undefined) return undefined;
  if (!STATUSES.includes(value as TaskStatus)) {
    throw new Error(`status must be one of: ${STATUSES.join(', ')}`);
  }
  return value as TaskStatus;
};

export const parsePriority = (value?: string): TaskPriority | undefined => {
  if (value === undefined) return undefined;
  if (!PRIORITIES.includes(value as TaskPriority)) {
    throw new Error(`priority must be one of: ${PRIORITIES.join(', ')}`);
  }
  return value as TaskPriority;
};

export const parseDueDate = (value?: string): number | undefined => {
  if (value === undefined) return undefined;
  const ms = DATE_PATTERN.test(value) ? new Date(`${value}T00:00:00`).getTime() : NaN;
  if (Number.isNaN(ms)) throw new Error('due_date must be a valid date in YYYY-MM-DD format');
  return ms;
};

const formatDate = (ms: number | null): string | null => {
  if (ms === null) return null;
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const summarizeTask = (task: StoredTask) => ({
  id: task.id,
  title: task.title,
  status: task.status,
  priority: task.priority,
  due_date: formatDate(task.endDate),
  session_id: task.sessionId,
  workflow_id: task.workflowId ?? null,
});

export const detailTask = (task: StoredTask) => ({
  ...summarizeTask(task),
  description: task.description,
  branch_name: task.branchName,
  start_date: formatDate(task.startDate),
  depends_on: task.dependsOn,
  tags: task.tags,
  checklist: task.checklist,
  attachments: task.attachments,
  archived: task.archived,
  created_at: task.createdAt,
  updated_at: task.updatedAt,
});

export async function runTaskTool(
  tool: string,
  params: TaskToolParams | undefined,
  handler: TaskToolHandler,
): Promise<string | null> {
  if (params?._validationError) {
    return `[${tool}] Result: Error - ${params._validationError}`;
  }
  const projectPath = getProjectPath();
  if (!projectPath) return `[${tool}] Result: Error - No active project`;
  try {
    return `[${tool}] Result:\n${await handler(params ?? {}, projectPath)}`;
  } catch (e) {
    return `[${tool}] Result: Error - ${e instanceof Error ? e.message : String(e)}`;
  }
}
