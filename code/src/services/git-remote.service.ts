import { promises as fs } from 'fs';
import { runGit } from './git-runner';
import { resolveDefaultBranch } from './git-write.service';

const resolveRemoteRef = async (cwd: string): Promise<string> => (await resolveDefaultBranch(cwd)).remoteRef;

export const gitRemoteService = {
  fetch: async (root: string): Promise<{ ok?: boolean; output?: string; error?: string }> => {
    const res = await runGit(['fetch', '--all', '--prune'], root);
    if (res.error) return { error: res.stderr || res.error.message };
    return { ok: true, output: res.stdout };
  },

  fileDiffVsRemote: async (
    root: string,
    filePath: string,
  ): Promise<{ diff?: string; remoteRef?: string; error?: string }> => {
    const remoteRef = await resolveRemoteRef(root);
    if (!remoteRef) return { error: 'no remote default branch' };

    const base = root.replace(/\/+$/, '');
    const rel = filePath.startsWith(`${base}/`) ? filePath.slice(base.length + 1) : filePath;

    const res = await runGit(['diff', '--no-color', remoteRef, '--', rel], root);
    if (res.error) return { error: res.stderr || res.error.message };
    if (res.stdout.trim()) return { diff: res.stdout, remoteRef };

    const tracked = await runGit(['ls-files', '--error-unmatch', '--', rel], root);
    if (!tracked.error) return { diff: '', remoteRef };

    const text = await fs.readFile(filePath, 'utf8');
    const lines = text.split('\n');
    if (lines[lines.length - 1] === '') lines.pop();
    const diff = [
      `diff --git a/${rel} b/${rel}`,
      'new file mode 100644',
      `@@ -0,0 +1,${lines.length} @@`,
      ...lines.map((l) => `+${l}`),
    ].join('\n');
    return { diff, remoteRef };
  },

  push: async (root: string): Promise<{ ok?: boolean; error?: string }> => {
    let push = await runGit(['push'], root);
    if (push.error) push = await runGit(['push', '-u', 'origin', 'HEAD'], root);
    if (push.error) return { error: push.stderr || push.error.message };
    return { ok: true };
  },

  commitPushFiles: async (
    root: string,
    absPaths: string[],
    message: string,
  ): Promise<{ ok?: boolean; committed?: boolean; error?: string }> => {
    const base = root.replace(/\/+$/, '');
    const allRels = (absPaths || [])
      .filter((p) => p.startsWith(`${base}/`))
      .map((p) => p.slice(base.length + 1));
    if (allRels.length === 0) return { error: 'No files to commit' };
    if (!message || !message.trim()) return { error: 'Empty commit message' };

    const ignoredOut = await runGit(['check-ignore', '--no-index', '--', ...allRels], root);
    const trackedOut = await runGit(['ls-files', '-z', '--', ...allRels], root);
    const trackedSet = new Set(trackedOut.stdout.split('\0').filter(Boolean));
    const ignoredSet = new Set(
      ignoredOut.stdout
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s && !trackedSet.has(s)),
    );

    const rels = allRels.filter(
      (r) => !ignoredSet.has(r) && !allRels.some((o) => o.startsWith(`${r}/`)),
    );
    if (rels.length === 0) return { error: 'All selected files are ignored by .gitignore' };

    const add = await runGit(['add', '-f', '--', ...rels], root);
    if (add.error) return { error: add.stderr || add.error.message };

    const commit = await runGit(['commit', '-m', message, '--', ...rels], root);
    if (commit.error) return { error: commit.stderr || commit.error.message };

    let push = await runGit(['push'], root);
    if (push.error) push = await runGit(['push', '-u', 'origin', 'HEAD'], root);
    if (push.error) return { committed: true, error: push.stderr || push.error.message };

    return { ok: true, committed: true };
  },
};