import { SourceOption, SyncFile, TreeNode } from '../types/sync-branch.types';

export const stripOrigin = (n: string) => n.replace(/^origin\//, '');

export const refOf = (o: SourceOption | null) =>
  !o ? '' : o.kind === 'remote' ? `origin/${o.name}` : o.name;

export function buildTree(files: SyncFile[]): TreeNode[] {
  const root: TreeNode = {
    name: '',
    path: '',
    isDir: true,
    children: [],
    added: 0,
    deleted: 0,
    files: [],
  };
  for (const f of files) {
    const parts = f.path.split('/');
    let node = root;
    parts.forEach((seg, i) => {
      const last = i === parts.length - 1;
      const p = parts.slice(0, i + 1).join('/');
      let child = node.children.find((c) => c.name === seg && c.isDir === !last);
      if (!child) {
        child = { name: seg, path: p, isDir: !last, children: [], added: 0, deleted: 0, files: [] };
        node.children.push(child);
      }
      if (last) {
        child.file = f;
        child.added = f.added;
        child.deleted = f.deleted;
      } else {
        child.added += f.added;
        child.deleted += f.deleted;
        child.files.push(f.path);
      }
      node = child;
    });
  }
  const finalize = (n: TreeNode): TreeNode => {
    n.children.sort((a, b) =>
      a.isDir === b.isDir ? a.name.localeCompare(b.name) : a.isDir ? -1 : 1,
    );
    n.children = n.children.map(finalize);
    if (n.isDir && n.name && n.children.length === 1 && n.children[0].isDir) {
      const only = n.children[0];
      return { ...only, name: `${n.name}/${only.name}` };
    }
    return n;
  };
  return finalize(root).children;
}

export function flatten(
  nodes: TreeNode[],
  collapsed: Set<string>,
  depth = 0,
  out: { node: TreeNode; depth: number }[] = [],
) {
  for (const n of nodes) {
    out.push({ node: n, depth });
    if (n.isDir && !collapsed.has(n.path)) flatten(n.children, collapsed, depth + 1, out);
  }
  return out;
}
