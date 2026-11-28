// ─── Imports ─────────────────────────────────────────────────────────────────
// ── UI ──
import { Circle, Loader, CheckCircle2, type LucideIcon } from 'lucide-react';

// ── Services ──
import type { TaskStatus } from '../../../shared/services/task.service';

// ─── Constants ───────────────────────────────────────────────────────────────
export const STATUS_META: Record<TaskStatus, { label: string; icon: LucideIcon; color: string }> = {
  todo: { label: 'Todo', icon: Circle, color: '--text-secondary' },
  progress: { label: 'In Progress', icon: Loader, color: '--info' },
  done: { label: 'Done', icon: CheckCircle2, color: '--success' },
};
