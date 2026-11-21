import { Circle, Loader, Eye, CheckCircle2, type LucideIcon } from 'lucide-react';
import type { TaskStatus } from '../../../services/task.service';

export const STATUS_META: Record<TaskStatus, { label: string; icon: LucideIcon; color: string }> = {
  todo: { label: 'Todo', icon: Circle, color: '--text-secondary' },
  progress: { label: 'In Progress', icon: Loader, color: '--info' },
  review: { label: 'In Review', icon: Eye, color: '--warn' },
  done: { label: 'Done', icon: CheckCircle2, color: '--success' },
};