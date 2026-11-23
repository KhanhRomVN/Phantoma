import { runGit, failure, lines, safeRef } from '../../infra/git-runner';

export const gitHistoryService = {
  log: async (root: string, limit?: number, ref?: string) => {
    const res = await runGit(
      [
        'log',
        ...(ref ? [safeRef(ref, 'ref')] : ['--all']),
        '--date-order',
        `--max-count=${limit ?? 300}`,
        '--format=%H%x1f%P%x1f%an%x1f%ae%x1f%at%x1f%D%x1f%s',
      ],
      root,
    );
    if (res.error) return failure(res);
    const commits = lines(res.stdout).map((line) => {
      const [hash, parents, author, email, at, refs, subject] = line.split('\x1f');
      return {
        hash,
        parents: parents ? parents.split(' ').filter(Boolean) : [],
        author,
        email,
        date: (parseInt(at, 10) || 0) * 1000,
        refs: refs ? refs.split(', ').filter(Boolean) : [],
        subject,
      };
    });
    return { commits };
  },

  unpushed: async (root: string) => {
    const res = await runGit(['log', 'HEAD', '--not', '--remotes', '--format=%H'], root);
    if (res.error) return failure(res);
    return { hashes: lines(res.stdout).map((l) => l.trim()) };
  },

  listTags: async (root: string) => {
    const res = await runGit(['tag', '--list', '--sort=-creatordate'], root);
    if (res.error) return failure(res);
    return { tags: lines(res.stdout).map((l) => l.trim()) };
  },

  resolveRef: async (root: string, ref: string) => {
    const res = await runGit(['rev-parse', '--verify', `${safeRef(ref, 'ref')}^{commit}`], root);
    if (res.error) return failure(res);
    return { hash: res.stdout.trim() };
  },

  commitBody: async (root: string, hash: string) => {
    const res = await runGit(['show', '-s', '--format=%B', safeRef(hash, 'hash')], root);
    if (res.error) return failure(res);
    return { message: res.stdout.trim() };
  },

  commitFiles: async (root: string, hash: string) => {
    safeRef(hash, 'hash');
    const [numstat, nameStatus] = await Promise.all([
      runGit(['show', '--numstat', '--no-renames', '--format=', hash], root),
      runGit(['show', '--name-status', '--no-renames', '--format=', hash], root),
    ]);
    if (numstat.error) return failure(numstat);

    const statusByPath = new Map<string, 'added' | 'modified' | 'deleted'>();
    if (!nameStatus.error) {
      for (const line of lines(nameStatus.stdout)) {
        const parts = line.split('\t');
        const code = parts[0].charAt(0);
        statusByPath.set(
          parts.slice(1).join('\t'),
          code === 'A' ? 'added' : code === 'D' ? 'deleted' : 'modified',
        );
      }
    }

    const files = lines(numstat.stdout).map((line) => {
      const parts = line.split('\t');
      const filePath = parts.slice(2).join('\t');
      return {
        added: parseInt(parts[0], 10) || 0,
        deleted: parseInt(parts[1], 10) || 0,
        path: filePath,
        status: statusByPath.get(filePath) ?? 'modified',
      };
    });
    return { files };
  },
};