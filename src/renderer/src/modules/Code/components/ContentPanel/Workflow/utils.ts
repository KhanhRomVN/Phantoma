import type { FileRef, WorkflowNode } from './types';

export const diffStat = (f: FileRef) => ({
  add: f.diff?.filter((l) => l.t === '+').length ?? 0,
  del: f.diff?.filter((l) => l.t === '-').length ?? 0,
});

export const nodeChangeStat = (node: WorkflowNode) =>
  node.files.reduce(
    (acc, f) => {
      const s = diffStat(f);
      return {
        changed: acc.changed + (f.action === 'read' ? 0 : 1),
        add: acc.add + s.add,
        del: acc.del + s.del,
      };
    },
    { changed: 0, add: 0, del: 0 },
  );

export const splitPath = (path: string) => {
  const idx = path.lastIndexOf('/');
  return { dir: idx >= 0 ? path.slice(0, idx) : '.', name: path.slice(idx + 1) };
};