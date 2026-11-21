import type { DiffLine, SnapshotDiff } from '../types/monitor.types';

export function toDiffLines(d: SnapshotDiff): DiffLine[] {
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < d.before.length || j < d.after.length) {
    const b = d.before[i];
    const a = d.after[j];
    if (i < d.before.length && j < d.after.length && b === a) {
      out.push({ kind: 'same', text: b });
      i++;
      j++;
    } else if (i < d.before.length && !d.after.includes(b)) {
      out.push({ kind: 'remove', text: b });
      i++;
    } else if (j < d.after.length) {
      out.push({ kind: 'add', text: a });
      j++;
    } else {
      i++;
    }
  }
  return out;
}