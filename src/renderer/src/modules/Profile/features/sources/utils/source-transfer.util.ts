import type { TransferPlanItem } from '../../../shared/types';
import { TransferMode } from '../components/SourceTransfer/source-transfer.types';
import { LAST_KEY, labels } from '../components/SourceTransfer/source-transfer.constants';

export function loadLast(): { mode: TransferMode; targetId: string | null } {
  try {
    const raw = localStorage.getItem(LAST_KEY);
    if (raw) {
      const v = JSON.parse(raw) as { mode?: string; targetId?: unknown };
      return { mode: v.mode === 'duplicate' ? 'duplicate' : 'move', targetId: typeof v.targetId === 'string' ? v.targetId : null };
    }
  } catch {
    return { mode: 'move', targetId: null };
  }
  return { mode: 'move', targetId: null };
}

export function saveLast(mode: TransferMode, targetId: string): void {
  try {
    localStorage.setItem(LAST_KEY, JSON.stringify({ mode, targetId }));
  } catch {
    return;
  }
}

export function conflictDetail(item: TransferPlanItem): string {
  const c = item.conflict;
  if (!c) return '';
  if (c.level === 'identical') return 'Same data in both sources';
  const parts: string[] = [];
  if (c.fillable.length > 0) parts.push(`Fills: ${labels(c.fillable)}`);
  if (c.differing.length > 0) parts.push(`Differs: ${labels(c.differing)}`);
  return parts.join(' | ');
}

export function nextFolderOf(item: TransferPlanItem): string {
  return item.conflict ? item.conflict.targetFolder : item.newFolder;
}
