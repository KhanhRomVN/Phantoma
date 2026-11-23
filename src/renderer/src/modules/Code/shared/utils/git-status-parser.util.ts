export type GitChangeKind = 'added' | 'modified' | 'deleted';

export interface GitStatusEntry {
  path: string;
  kind: GitChangeKind;
}

export interface GitStatusCounts {
  added: number;
  modified: number;
  deleted: number;
}

export function parseGitStatusOutput(output: string): GitStatusEntry[] {
  const entries: GitStatusEntry[] = [];
  for (const line of output.split('\n')) {
    const m = line.match(/^([ MADRCU?!]{1,2})\s+(.*)$/);
    if (!m) continue;
    const code = m[1].trim();
    let rel = m[2].trim();
    const arrow = rel.indexOf(' -> ');
    if (arrow >= 0) rel = rel.slice(arrow + 4);
    rel = rel.replace(/^"|"$/g, '');
    if (rel.endsWith('/')) continue; // ASSUMED: trailing '/' = nested git repo (git không liệt kê file bên trong), không phải file của project
    if (!rel) continue;
    const kind: GitChangeKind = code.includes('D')
      ? 'deleted'
      : code === '??' || code.includes('A')
        ? 'added'
        : 'modified';
    entries.push({ path: rel, kind });
  }
  return entries;
}

export function countGitStatus(entries: GitStatusEntry[]): GitStatusCounts {
  const counts: GitStatusCounts = { added: 0, modified: 0, deleted: 0 };
  for (const e of entries) counts[e.kind]++;
  return counts;
}