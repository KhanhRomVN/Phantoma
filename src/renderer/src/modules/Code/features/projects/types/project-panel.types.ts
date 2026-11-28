// ─── Imports ─────────────────────────────────────────────────────────────────
// ── Stores ──
import type { Project } from '../../../shared/stores/code.store';

// ── Types ──
import type { ProjectExtended as CardProject } from './project-card.types';
import type { MenuPosition } from './session.types';

// ─── Types ───────────────────────────────────────────────────────────────────
export type ProjectExtended = Project & CardProject & { defaultBranch: string };

export interface GroupInfo {
  id: string;
  name: string;
  open: boolean;
  iconId?: string;
}

export type SortMode = 'manual' | 'name' | 'status' | 'tokens';

export type DropdownTarget =
  | { kind: 'project'; projectId: string; pos: MenuPosition }
  | { kind: 'branch'; projectId: string; branchName: string; pos: MenuPosition }
  | { kind: 'group'; groupId: string; pos: MenuPosition }
  | { kind: 'header-config'; pos: MenuPosition }
  | { kind: 'task'; sessionId: string; pos: MenuPosition }
  | { kind: 'session'; sessionId: string; projectId: string; pos: MenuPosition }
  | { kind: 'process'; sessionId: string; index: number; pos: MenuPosition }
  | { kind: 'move-to-group'; projectId: string; pos: MenuPosition };