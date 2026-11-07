import {
  Ban,
  CheckCircle2,
  Circle,
  CircleDot,
  Eye,
  FolderOpen,
  Lightbulb,
  ListChecks,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import type { TabId } from './types';

export const STATUS_META = {
  done: {
    label: 'Done',
    icon: CheckCircle2,
    text: 'text-success',
    chip: 'text-success bg-success/10 border-success/20',
    seg: 'bg-success',
    dot: 'bg-success/15 border-success/50 text-success',
    selected: 'bg-success/[0.08] border-success/50',
  },
  active: {
    label: 'In progress',
    icon: CircleDot,
    text: 'text-info',
    chip: 'text-info bg-info/10 border-info/20',
    seg: 'bg-primary',
    dot: 'bg-info/15 border-info/60 text-info ring-4 ring-info/15',
    selected: 'bg-info/[0.08] border-info/50',
  },
  todo: {
    label: 'To do',
    icon: Circle,
    text: 'text-text-secondary/60',
    chip: 'text-text-secondary bg-white/[0.04] border-border',
    seg: 'bg-border',
    dot: 'bg-background border-border text-text-secondary/60',
    selected: 'bg-white/[0.06] border-text-secondary/40',
  },
  blocked: {
    label: 'Blocked',
    icon: Ban,
    text: 'text-warn',
    chip: 'text-warn bg-warn/10 border-warn/20',
    seg: 'bg-warn/60',
    dot: 'bg-warn/10 border-warn/40 text-warn',
    selected: 'bg-warn/[0.08] border-warn/50',
  },
} as const;

export const ACTION_META = {
  create: { label: 'Create', icon: Plus, cls: 'text-success bg-success/10 border-success/20' },
  modify: { label: 'Modify', icon: Pencil, cls: 'text-info bg-info/10 border-info/20' },
  read: { label: 'Read', icon: Eye, cls: 'text-text-secondary bg-white/[0.04] border-border' },
  delete: { label: 'Delete', icon: Trash2, cls: 'text-red-400 bg-red-500/10 border-red-500/20' },
} as const;

export const TABS: { id: TabId; label: string; icon: typeof ListChecks }[] = [
  { id: 'overview', label: 'Overview', icon: ListChecks },
  { id: 'files', label: 'Files', icon: FolderOpen },
  { id: 'conclusion', label: 'Conclusion', icon: Lightbulb },
];

export const SURFACE = 'rounded-xl bg-white/[0.025] ring-1 ring-white/[0.06]';