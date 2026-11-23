import { promises as fs } from 'fs';
import path from 'path';
import { runGit, type GitResult } from './git-runner';

const message = (res: GitResult): string => res.stderr || res.error?.message || 'git command failed';

export async function resolveDefaultBranch(cwd: string): Promise<{ name: string; remoteRef: string }> {
  const head = await runGit(['symbolic-ref', '--short', 'refs/remotes/origin/HEAD'], cwd);
  let name = head.error ? '' : head.stdout.trim().replace(/^origin\//, '');
  if (!name) {
    const cfg = await runGit(['config', '--get', 'init.defaultBranch'], cwd);
    const c = cfg.error ? '' : cfg.stdout.trim();
    if (c) {
      const ok = await runGit(['show-ref', '--verify', '--quiet', `refs/heads/${c}`], cwd);
      if (!ok.error) name = c;
    }
  }
  if (!name) return { name: '', remoteRef: '' };
  const remote = await runGit(['show-ref', '--verify', '--quiet', `refs/remotes/origin/${name}`], cwd);
  return { name, remoteRef: remote.error ? '' : `origin/${name}` };
}

const PROTECT_MARKER = '# phantoma-protect-default-branch';
const PRE_COMMIT_HOOK = `#!/bin/sh
${PROTECT_MARKER}
branch=$(git symbolic-ref --short HEAD 2>/dev/null)
default=$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's#^origin/##')
[ -z "$default" ] && default=$(git config --get init.defaultBranch)
if [ -n "$branch" ] && [ "$branch" = "$default" ]; then
  echo "Phantoma: committing directly to '$default' is blocked. Create a feature branch, commit there and open a pull request." >&2
  exit 1
fi
exit 0
`;
const PRE_PUSH_HOOK = `#!/bin/sh
${PROTECT_MARKER}
default=$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's#^origin/##')
[ -z "$default" ] && default=$(git config --get init.defaultBranch)
[ -z "$default" ] && exit 0
while read local_ref local_sha remote_ref remote_sha; do
  if [ "$remote_ref" = "refs/heads/$default" ]; then
    echo "Phantoma: pushing directly to '$default' is blocked. Push a feature branch and open a pull request." >&2
    exit 1
  fi
done
exit 0
`;
const PROTECT_HOOKS: Record<string, string> = {
  'pre-commit': PRE_COMMIT_HOOK,
  'pre-push': PRE_PUSH_HOOK,
};

const resolveHooksDir = async (cwd: string): Promise<string> => {
  const out = await runGit(['rev-parse', '--git-path', 'hooks'], cwd);
  return out.error ? '' : path.resolve(cwd, out.stdout.trim());
};

const readHook = async (file: string): Promise<string | null> => {
  try {
    return await fs.readFile(file, 'utf8');
  } catch {
    return null;
  }
};

const NOT_A_REPO = { error: 'Not a git repository' };

export const gitWriteService = {
  checkout: async (root: string, branch: string): Promise<{ ok?: boolean; error?: string }> => {
    if (branch.startsWith('-')) return { error: 'Invalid branch name' };
    let args = ['checkout', branch];
    if (branch.startsWith('origin/')) {
      const localName = branch.slice('origin/'.length);
      const exists = await runGit(['show-ref', '--verify', '--quiet', `refs/heads/${localName}`], root);
      args = exists.error ? ['checkout', '--track', branch] : ['checkout', localName];
    }
    const res = await runGit(args, root);
    return res.error ? { error: message(res) } : { ok: true };
  },

  commit: async (root: string, msg: string): Promise<{ success?: boolean; output?: string; error?: string }> => {
    const res = await runGit(['commit', '-m', msg], root);
    return res.error ? { error: message(res) } : { success: true, output: res.stdout };
  },

  stage: async (root: string, files: string[]): Promise<{ success?: boolean; error?: string }> => {
    if (files.length === 0) return { success: true };
    const res = await runGit(['add', '--', ...files], root);
    return res.error ? { error: message(res) } : { success: true };
  },

  stageAll: async (root: string): Promise<{ success?: boolean; error?: string }> => {
    const res = await runGit(['add', '-A'], root);
    return res.error ? { error: message(res) } : { success: true };
  },

  unstage: async (root: string, files: string[]): Promise<{ success?: boolean; error?: string }> => {
    if (files.length === 0) return { success: true };
    const res = await runGit(['restore', '--staged', '--', ...files], root);
    return res.error ? { error: message(res) } : { success: true };
  },

  unstageAll: async (root: string): Promise<{ success?: boolean; error?: string }> => {
    const res = await runGit(['restore', '--staged', '--', '.'], root);
    return res.error ? { error: message(res) } : { success: true };
  },

  scopeTransfer: async (
    root: string,
    targetRoot: string,
    files: string[],
  ): Promise<{ transferred?: number; conflicts?: string[]; error?: string }> => {
    const src = path.resolve(root);
    const dst = path.resolve(targetRoot);
    if (src === dst) return { error: 'Source and target must be different branches' };
    const rels = [...new Set(files)];
    for (const rel of rels) {
      const a = path.resolve(src, rel);
      const b = path.resolve(dst, rel);
      if (path.isAbsolute(rel) || !a.startsWith(`${src}${path.sep}`) || !b.startsWith(`${dst}${path.sep}`)) {
        return { error: `Invalid path: ${rel}` };
      }
    }
    for (const rel of rels) {
      const isDir = await fs
        .stat(path.resolve(src, rel))
        .then((s) => s.isDirectory())
        .catch(() => false);
      if (isDir) return { error: `Not a file: ${rel}` };
    }
    if (rels.length === 0) return { transferred: 0 };
    const literal = (list: string[]) => list.map((p) => `:(literal)${p}`);

    const dirty = await runGit(['status', '--porcelain', '--', ...literal(rels)], dst);
    if (dirty.error) return { error: message(dirty) };
    const conflicts = dirty.stdout
      .split('\n')
      .filter(Boolean)
      .map((l) => l.slice(3).trim().replace(/^"|"$/g, ''));
    if (conflicts.length > 0) {
      return { conflicts, error: 'Target branch already has uncommitted changes in these files' };
    }

    for (const rel of rels) {
      const a = path.resolve(src, rel);
      const b = path.resolve(dst, rel);
      const exists = await fs
        .stat(a)
        .then((s) => s.isFile())
        .catch(() => false);
      if (exists) {
        await fs.mkdir(path.dirname(b), { recursive: true });
        await fs.copyFile(a, b);
      } else {
        await fs.rm(b, { force: true });
      }
    }

    const inHead: string[] = [];
    const fresh: string[] = [];
    for (const rel of rels) {
      const res = await runGit(['cat-file', '-e', `HEAD:${rel}`], src);
      (res.error ? fresh : inHead).push(rel);
    }
    for (let i = 0; i < inHead.length; i += 200) {
      const res = await runGit(
        ['restore', '--source=HEAD', '--staged', '--worktree', '--', ...literal(inHead.slice(i, i + 200))],
        src,
      );
      if (res.error) return { error: message(res) };
    }
    if (fresh.length > 0) {
      await runGit(['rm', '-r', '--cached', '--ignore-unmatch', '-q', '--', ...literal(fresh)], src);
      for (const rel of fresh) await fs.rm(path.resolve(src, rel), { force: true });
    }
    return { transferred: rels.length };
  },

  pruneOrphanBranches: async (root: string): Promise<{ pruned?: string[]; skipped?: string; error?: string }> => {
    await runGit(['worktree', 'prune'], root);

    const { name: defaultBranch } = await resolveDefaultBranch(root);
    if (!defaultBranch) return { pruned: [], skipped: 'no default branch' };

    const merged = await runGit(['branch', '--merged', defaultBranch, '--format=%(refname:short)'], root);
    if (merged.error) return { error: message(merged) };

    const protectedNames = new Set<string>([defaultBranch]);
    const current = await runGit(['branch', '--show-current'], root);
    if (current.stdout.trim()) protectedNames.add(current.stdout.trim());
    const wtList = await runGit(['worktree', 'list', '--porcelain'], root);
    for (const line of wtList.stdout.split('\n')) {
      if (line.startsWith('branch ')) protectedNames.add(line.slice(7).trim().replace(/^refs\/heads\//, ''));
    }

    const pruned: string[] = [];
    for (const name of merged.stdout.split('\n').map((l) => l.trim()).filter(Boolean)) {
      if (protectedNames.has(name)) continue;
      const del = await runGit(['branch', '-d', name], root);
      if (!del.error) pruned.push(name);
    }
    return { pruned };
  },

  clone: async (url: string, dest: string, branch?: string): Promise<{ ok: boolean }> => {
    const args = ['clone', ...(branch ? ['--branch', branch] : []), '--', url, dest];
    const res = await runGit(args, process.cwd());
    if (res.error) throw new Error(message(res));
    return { ok: true };
  },

  protectStatus: async (root: string): Promise<{ protected?: boolean; conflict?: boolean; error?: string }> => {
    const dir = await resolveHooksDir(root);
    if (!dir) return NOT_A_REPO;
    let installed = 0;
    let conflict = false;
    for (const name of Object.keys(PROTECT_HOOKS)) {
      const content = await readHook(path.join(dir, name));
      if (content === null) continue;
      if (content.includes(PROTECT_MARKER)) installed++;
      else conflict = true;
    }
    return { protected: installed === Object.keys(PROTECT_HOOKS).length, conflict };
  },

  protectEnable: async (root: string): Promise<{ ok?: boolean; error?: string }> => {
    const dir = await resolveHooksDir(root);
    if (!dir) return NOT_A_REPO;
    for (const name of Object.keys(PROTECT_HOOKS)) {
      const content = await readHook(path.join(dir, name));
      if (content !== null && !content.includes(PROTECT_MARKER)) {
        return { error: `A ${name} hook already exists in ${dir}. Add the default-branch check to it manually.` };
      }
    }
    await fs.mkdir(dir, { recursive: true });
    for (const [name, script] of Object.entries(PROTECT_HOOKS)) {
      await fs.writeFile(path.join(dir, name), script, { mode: 0o755 });
      await fs.chmod(path.join(dir, name), 0o755);
    }
    return { ok: true };
  },

  protectDisable: async (root: string): Promise<{ ok?: boolean; error?: string }> => {
    const dir = await resolveHooksDir(root);
    if (!dir) return NOT_A_REPO;
    for (const name of Object.keys(PROTECT_HOOKS)) {
      const content = await readHook(path.join(dir, name));
      if (content !== null && content.includes(PROTECT_MARKER)) await fs.unlink(path.join(dir, name));
    }
    return { ok: true };
  },

  checkReady: async (root: string): Promise<{ hasGit: boolean; hasStaged: boolean; reason?: string }> => {
    const inside = await runGit(['rev-parse', '--is-inside-work-tree'], root);
    if (inside.error || inside.stdout.trim() !== 'true') {
      return { hasGit: false, hasStaged: false, reason: 'Workspace is not a git repository' };
    }
    const staged = await runGit(['diff', '--cached', '--name-only'], root);
    const hasStaged = !staged.error && staged.stdout.trim().length > 0;
    return { hasGit: true, hasStaged, reason: hasStaged ? undefined : 'No staged changes. Run git add first.' };
  },
};