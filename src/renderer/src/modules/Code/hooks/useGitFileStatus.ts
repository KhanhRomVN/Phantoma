import { useEffect, useState } from 'react';

export type GitFileStatus = 'added' | 'modified';
export type GitStatusMap = Record<string, GitFileStatus>;

const POLL_MS = 5000;
const EMPTY: GitStatusMap = {};

interface Entry {
  map: GitStatusMap;
  subs: Set<(map: GitStatusMap) => void>;
  timer: ReturnType<typeof setInterval> | null;
}

const entries = new Map<string, Entry>();

function parseStatus(root: string, output: string): GitStatusMap {
  const base = root.replace(/\/+$/, '');
  const map: GitStatusMap = {};
  for (const line of output.split('\n')) {
    const m = line.match(/^([ MADRCU?!]{1,2})\s+(.*)$/);
    if (!m) continue;
    const code = m[1].trim();
    if (code.includes('D')) continue;
    let rel = m[2].trim();
    const arrow = rel.indexOf(' -> ');
    if (arrow >= 0) rel = rel.slice(arrow + 4);
    rel = rel.replace(/^"|"$/g, '').replace(/\/$/, '');
    const status: GitFileStatus = code === '??' || code.includes('A') ? 'added' : 'modified';
    let abs = `${base}/${rel}`;
    map[abs] = status;
    let idx = abs.lastIndexOf('/');
    while (idx > base.length) {
      abs = abs.slice(0, idx);
      if (status === 'modified' || !map[abs]) map[abs] = status;
      idx = abs.lastIndexOf('/');
    }
  }
  return map;
}

async function load(root: string, entry: Entry): Promise<void> {
  let next: GitStatusMap = EMPTY;
  try {
    const res = await window.api.invoke('git:status', root);
    if (res && !res.error) next = parseStatus(root, String(res.output ?? ''));
  } catch {
    next = EMPTY;
  }
  entry.map = next;
  entry.subs.forEach((fn) => fn(next));
}

/** Shared, ref-counted git status poller: one poll per root regardless of subscriber count. */
export function useGitFileStatus(root?: string): GitStatusMap {
  const [map, setMap] = useState<GitStatusMap>(() => (root ? entries.get(root)?.map ?? EMPTY : EMPTY));

  useEffect(() => {
    if (!root) {
      setMap(EMPTY);
      return;
    }
    let entry = entries.get(root);
    if (!entry) {
      entry = { map: EMPTY, subs: new Set(), timer: null };
      entries.set(root, entry);
    }
    const current = entry;
    current.subs.add(setMap);
    setMap(current.map);
    if (!current.timer) {
      void load(root, current);
      current.timer = setInterval(() => void load(root, current), POLL_MS);
    }
    return () => {
      current.subs.delete(setMap);
      if (current.subs.size === 0) {
        if (current.timer) clearInterval(current.timer);
        entries.delete(root);
      }
    };
  }, [root]);

  return map;
}