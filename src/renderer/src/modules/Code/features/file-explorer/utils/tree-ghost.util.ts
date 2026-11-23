import { type FileNode } from '../../../shared/stores/code.store';
import { compareDirEntries } from '../services/file-tree.service';
import { GhostIndex } from '../types/file-explorer.types';

export const GHOST_PREFIX = 'ghost_';

export const withGhosts = (
  children: FileNode[] | undefined,
  dirPath: string | undefined,
  index: GhostIndex,
): FileNode[] | undefined => {
  const ghosts = dirPath ? index.get(dirPath) : undefined;
  if (!ghosts || ghosts.size === 0) return children;
  const existing = new Set((children ?? []).map((c) => c.name));
  const extra: FileNode[] = [];
  ghosts.forEach((kind, name) => {
    if (existing.has(name)) return;
    const path = `${dirPath}/${name}`;
    extra.push({
      id: `${GHOST_PREFIX}${path}`,
      name,
      type: kind,
      path,
      children: kind === 'folder' ? [] : undefined,
    });
  });
  if (extra.length === 0) return children;
  return [...(children ?? []), ...extra].sort((a, b) =>
    compareDirEntries(
      { name: a.name, isDirectory: a.type === 'folder' },
      { name: b.name, isDirectory: b.type === 'folder' },
    ),
  );
};
