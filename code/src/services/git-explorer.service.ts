import path from 'path';
import { gitService } from './git.service';
import { runGit } from './git-runner';
import { resolveDefaultBranch } from './git-write.service';

const ignoredRoots = async (root: string, base: string): Promise<string[]> => {
  const res = await runGit(
    ['ls-files', '--others', '--ignored', '--exclude-standard', '--directory'],
    root,
  );
  if (res.error) return [];
  return res.stdout
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => path.join(base, l.replace(/\/+$/, '')));
};

type FileStatus = 'added' | 'modified' | 'deleted';
type GhostKind = 'file' | 'folder';

export interface ExplorerStats {
  primary: string[];
  warn: string[];
  diff: string[];
  error: string[];
  deletedPaths: string[];
  otherBranches: string[];
}

export interface ExplorerState {
  files: Record<string, FileStatus>;
  visible: Record<string, FileStatus>;
  ignoredPaths: string[];
  ghosts: Record<string, Array<[string, GhostKind]>>;
  otherFiles: Record<string, string[]>;
  stats: ExplorerStats;
}

const emptyStats = (): ExplorerStats => ({
  primary: [],
  warn: [],
  diff: [],
  error: [],
  deletedPaths: [],
  otherBranches: [],
});

const inScope = (rel: string, scope: string[]): boolean =>
  scope.some((p) => rel === p || rel.startsWith(`${p}/`));

const withAncestors = (
  raw: Record<string, FileStatus>,
  base: string,
): Record<string, FileStatus> => {
  const map: Record<string, FileStatus> = {};
  for (const [abs, status] of Object.entries(raw)) {
    map[abs] = status;
    const ancestor: FileStatus = status === 'added' ? 'added' : 'modified';
    let idx = abs.lastIndexOf('/');
    while (idx > base.length) {
      const parent = abs.slice(0, idx);
      if (ancestor === 'modified' || !map[parent]) map[parent] = ancestor;
      idx = parent.lastIndexOf('/');
    }
  }
  return map;
};

const isIgnored = (p: string, ignored: Set<string>): boolean => {
  if (ignored.has(p)) return true;
  let idx = p.lastIndexOf('/');
  while (idx > 0) {
    if (ignored.has(p.slice(0, idx))) return true;
    idx = p.lastIndexOf('/', idx - 1);
  }
  return false;
};

const toVisible = (
  files: Record<string, FileStatus>,
  ignored: Set<string>,
): Record<string, FileStatus> => {
  const dirKeys = new Set<string>();
  for (const p of Object.keys(files)) {
    let idx = p.lastIndexOf('/');
    while (idx > 0) {
      dirKeys.add(p.slice(0, idx));
      idx = p.lastIndexOf('/', idx - 1);
    }
  }
  const out: Record<string, FileStatus> = {};
  for (const [p, status] of Object.entries(files)) {
    if (dirKeys.has(p) || isIgnored(p, ignored)) continue;
    out[p] = status;
  }
  return out;
};

const buildGhosts = (
  visible: Record<string, FileStatus>,
  base: string,
): Record<string, Array<[string, GhostKind]>> => {
  const index = new Map<string, Map<string, GhostKind>>();
  for (const [p, status] of Object.entries(visible)) {
    if (status !== 'deleted' || !p.startsWith(`${base}/`)) continue;
    const parts = p.slice(base.length + 1).split('/');
    let dir = base;
    parts.forEach((seg, i) => {
      let names = index.get(dir);
      if (!names) {
        names = new Map();
        index.set(dir, names);
      }
      if (!names.has(seg)) names.set(seg, i === parts.length - 1 ? 'file' : 'folder');
      dir = `${dir}/${seg}`;
    });
  }
  const out: Record<string, Array<[string, GhostKind]>> = {};
  index.forEach((names, dir) => {
    out[dir] = [...names.entries()];
  });
  return out;
};

// ASSUMED: remoteDiff = null (không có origin/<default>) → file ngoài scope không bao giờ là warn
const classify = (
  files: Record<string, FileStatus>,
  otherFiles: Record<string, string[]>,
  scope: string[],
  base: string,
  remoteDiff: Set<string> | null,
): ExplorerStats => {
  const stats = emptyStats();
  const branches = new Set<string>();
  for (const p of Object.keys(files).sort()) {
    if (!p.startsWith(`${base}/`)) continue;
    if (inScope(p.slice(base.length + 1), scope)) {
      stats.primary.push(p);
    } else if (remoteDiff && !remoteDiff.has(p) && files[p] !== 'added') {
      stats.warn.push(p);
      if (files[p] === 'deleted') stats.deletedPaths.push(p);
    } else if (otherFiles[p]) {
      stats.error.push(p);
      for (const b of otherFiles[p]) branches.add(b);
    } else {
      stats.diff.push(p);
      if (files[p] === 'deleted') stats.deletedPaths.push(p);
    }
  }
  stats.otherBranches = [...branches].sort();
  return stats;
};

const loadRemoteDiff = async (root: string): Promise<Set<string> | null> => {
  const { remoteRef } = await resolveDefaultBranch(root);
  if (!remoteRef) return null;
  try {
    const { files } = await gitService.remoteDiff(root, remoteRef);
    return files;
  } catch (err) {
    return null;
  }
};

export const gitExplorerService = {
  diffVsDefault: async (root: string): Promise<{ files: string[] | null }> => {
    const set = await loadRemoteDiff(root);
    return { files: set ? [...set] : null };
  },
  state: async (root: string, scope: string[], active: boolean): Promise<ExplorerState> => {
    const base = root.replace(/\/+$/, '');
    const noOther = { files: {} as Record<string, string[]> };
    const [raw, ignoredList, other, remoteDiff] = await Promise.all([
      gitService.statusFiles(root),
      ignoredRoots(root, base),
      active ? gitService.changedInOtherBranches(root).catch(() => noOther) : noOther,
      active ? loadRemoteDiff(root) : null,
    ]);
    const files = withAncestors(raw, base);
    const visible = toVisible(files, new Set(ignoredList));
    return {
      files,
      visible,
      ignoredPaths: ignoredList,
      ghosts: buildGhosts(visible, base),
      otherFiles: other.files,
      stats: active ? classify(visible, other.files, scope, base, remoteDiff) : emptyStats(),
    };
  },
};
