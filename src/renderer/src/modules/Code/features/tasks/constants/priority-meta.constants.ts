// ─── Imports ─────────────────────────────────────────────────────────────────
// ── Services ──
import type { TaskPriority } from '../../../shared/services/task.service';

// ─── Constants ───────────────────────────────────────────────────────────────
export const PRIORITY_META: Record<TaskPriority, { label: string; color: string }> = {
  high: { label: 'High', color: '--error' },
  medium: { label: 'Medium', color: '--warn' },
  low: { label: 'Low', color: '--text-secondary' },
};