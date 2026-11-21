import { promises as fs } from 'fs';
import path from 'path';
import { runGit, type GitResult } from './git-runner';

type GitError = { error: string };
type FileKind = 'added' | 'modified' | 'deleted';
interface ChangedFile {
  added: number;
  deleted: number;
  path: string;
  status: FileKind;
  staged?: boolean;
  unstaged?: boolean;
  untracked?: boolean;
}

const LANGUAGE_BY_EXT = new Map<string, string>(
  Object.entries({
    ts: 'TypeScript',
    tsx: 'TypeScript',
    js: 'JavaScript',
    jsx: 'JavaScript',
    mjs: 'JavaScript',
    cjs: 'JavaScript',
    html: 'HTML',
    htm: 'HTML',
    css: 'CSS',
    scss: 'SCSS',
    vue: 'Vue',
    py: 'Python',
    go: 'Go',
    rs: 'Rust',
    java: 'Java',
    rb: 'Ruby',
    php: 'PHP',
    cs: 'C#',
    cpp: 'C++',
    c: 'C',
    swift: 'Swift',
    kt: 'Kotlin',
    sh: 'Shell',
  }),
);
const IGNORED_LANGUAGE_PATH = /(^|\/)(node_modules|dist|build|out|monaco|vendor)\//;

const lines = (s: string): string[] => s.split('\n').filter((l) => l.trim().length > 0);

const failure = (res: GitResult): GitError => ({
  error: res.stderr || res.error?.message || 'Git command failed',
});

const safeRef = (value: string, field: string): string => {
  if (!value || value.startsWith('-')) throw new Error(`Invalid ${field}`);
  return value;
};

export const gitReadService = {
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

  listBranches: async (root: string) => {
    const res = await runGit(['branch', '-a', '--format=%(refname:short)'], root);
    if (res.error) return failure(res);

    const branches = lines(res.stdout)
      .map((l) => l.trim())
      .filter((l) => !l.startsWith('remotes/origin/HEAD'));

    const worktreePaths: Record<string, string> = {};
    const wtList = await runGit(['worktree', 'list', '--porcelain'], root);
    if (!wtList.error) {
      const mainRoot = path.resolve(root);
      for (const block of wtList.stdout.split(/\n\s*\n/)) {
        const rows = block.split('\n');
        const wtPath = rows.find((l) => l.startsWith('worktree '))?.slice(9).trim();
        const ref = rows.find((l) => l.startsWith('branch '))?.slice(7).trim();
        if (!wtPath || !ref || path.resolve(wtPath) === mainRoot) continue;
        worktreePaths[ref.replace(/^refs\/heads\//, '')] = wtPath;
      }
    }
    return { branches, worktreePaths };
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

  isRepo: async (root: string): Promise<boolean> => {
    const res = await runGit(['rev-parse', '--is-inside-work-tree'], root);
    return !res.error && res.stdout.trim() === 'true';
  },

  repoIdentity: async (root: string) => {
    const common = await runGit(['rev-parse', '--path-format=absolute', '--git-common-dir'], root);
    if (common.error) return null;
    const top = await runGit(['rev-parse', '--show-toplevel'], root);
    if (top.error) return null;
    const [realTop, realCwd] = await Promise.all([
      fs.realpath(top.stdout.trim()).catch(() => path.resolve(top.stdout.trim())),
      fs.realpath(root).catch(() => path.resolve(root)),
    ]);
    if (realTop !== realCwd) return null;
    const [remote, branch] = await Promise.all([
      runGit(['config', '--get', 'remote.origin.url'], root),
      runGit(['branch', '--show-current'], root),
    ]);
    return {
      commonDir: path.resolve(common.stdout.trim()),
      remoteUrl: remote.stdout?.trim() || '',
      branch: branch.stdout?.trim() || '',
    };
  },

  commitDiff: async (root: string, hash: string) => {
    const res = await runGit(
      ['show', '--format=', '--no-color', '-M', '--patch', safeRef(hash, 'hash')],
      root,
    );
    if (res.error) return failure(res);
    return { diff: res.stdout };
  },

  localDiff: async (root: string, branch: string) => {
    safeRef(branch, 'branch');
    const head = await runGit(['rev-parse', '--abbrev-ref', 'HEAD'], root);
    const isCurrent = head.stdout.trim() === branch;
    const res = await runGit(
      ['diff', '--no-color', '-M', `origin/${branch}`, ...(isCurrent ? [] : [branch])],
      root,
    );
    if (res.error) return failure(res);
    return { diff: res.stdout };
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

  remoteUrl: async (root: string) => {
    const res = await runGit(['remote', 'get-url', 'origin'], root);
    if (res.error) return failure(res);
    return { url: res.stdout.trim() };
  },

  localChanges: async (root: string) => {
    const [refsRes, headRes] = await Promise.all([
      runGit(['for-each-ref', '--format=%(refname:short)', 'refs/heads', 'refs/remotes/origin'], root),
      runGit(['rev-parse', '--abbrev-ref', 'HEAD'], root),
    ]);
    if (refsRes.error) return failure(refsRes);

    const refs = new Set(lines(refsRes.stdout).map((l) => l.trim()));
    const current = headRes.stdout.trim();
    const locals = [...refs].filter(
      (r) => r !== 'origin' && !r.startsWith('origin/') && refs.has(`origin/${r}`),
    );

    const parseNumstat = (out: string) =>
      lines(out).map((line) => {
        const p = line.split('\t');
        return { added: parseInt(p[0], 10) || 0, deleted: parseInt(p[1], 10) || 0, path: p.slice(2).join('\t') };
      });

    const branches = await Promise.all(
      locals.map(async (name) => {
        const range = [`origin/${name}`, ...(name === current ? [] : [name])];
        const [diff, nameStatus] = await Promise.all([
          runGit(['diff', '--numstat', '--no-renames', ...range], root),
          runGit(['diff', '--name-status', '--no-renames', ...range], root),
        ]);
        const kindByPath = new Map<string, FileKind>();
        if (!nameStatus.error) {
          for (const l of lines(nameStatus.stdout)) {
            const p = l.split('\t');
            const code = p[0].charAt(0);
            kindByPath.set(p.slice(1).join('\t'), code === 'A' ? 'added' : code === 'D' ? 'deleted' : 'modified');
          }
        }
        const files: ChangedFile[] = diff.error
          ? []
          : parseNumstat(diff.stdout).map((f) => ({ ...f, status: kindByPath.get(f.path) ?? 'modified' }));

        if (name === current) {
          const status = await runGit(['status', '--porcelain', '--untracked-files=all'], root);
          for (const l of status.stdout.split('\n').filter((row) => row.length > 3)) {
            const untracked = l[0] === '?';
            const staged = !untracked && l[0] !== ' ';
            const unstaged = untracked || l[1] !== ' ';
            const code = l.slice(0, 2);
            let filePath = l.slice(3).trim();
            if (filePath.includes(' -> ')) filePath = filePath.split(' -> ')[1];
            if (!filePath) continue;
            let file = files.find((f) => f.path === filePath);
            if (!file) {
              const kind: FileKind =
                untracked || code.includes('A') ? 'added' : code.includes('D') ? 'deleted' : 'modified';
              file = { added: 0, deleted: 0, path: filePath, status: kind };
              files.push(file);
            }
            Object.assign(file, { staged, unstaged, untracked });
          }
        }
        return { name, files };
      }),
    );

    return { branches: branches.filter((b) => b.files.length > 0) };
  },

  fileDiff: async (root: string, filePath: string) => {
    if (!filePath) return { error: 'file_path is required' };
    const base = path.resolve(root);
    const absFile = path.resolve(base, filePath);
    if (absFile !== base && !absFile.startsWith(base + path.sep)) return { error: 'Path is outside project' };

    let cwd = base;
    let dir = path.dirname(absFile);
    while (dir.startsWith(base)) {
      const hasGit = await fs.access(path.join(dir, '.git')).then(
        () => true,
        () => false,
      );
      if (hasGit) {
        cwd = dir;
        break;
      }
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    const gitPath = absFile.startsWith(cwd) ? absFile.slice(cwd.length + 1) : absFile;

    const tracked = await runGit(['ls-files', '--', gitPath], cwd);
    if (!tracked.stdout.trim()) {
      try {
        const content = await fs.readFile(absFile, 'utf-8');
        const rows = content.split('\n');
        const body = rows.map((l) => '+' + l).join('\n');
        return { output: `--- /dev/null\n+++ b/${filePath}\n@@ -0,0 +1,${rows.length} @@\n${body}` };
      } catch {
        return { output: '' };
      }
    }

    const [cached, unstaged] = await Promise.all([
      runGit(['diff', '--cached', '--', gitPath], cwd),
      runGit(['diff', '--', gitPath], cwd),
    ]);
    if (cached.error && unstaged.error) return failure(cached);
    return { output: cached.stdout.trim() ? cached.stdout : unstaged.stdout };
  },

  languageStats: async (root: string) => {
    const list = await runGit(['ls-files', '-z'], root);
    if (list.error) return [];

    const files = list.stdout
      .split('\0')
      .filter((f) => f && !IGNORED_LANGUAGE_PATH.test(f) && !f.endsWith('.min.js'));
    const bytesByLang = new Map<string, number>();

    for (let i = 0; i < files.length; i += 200) {
      await Promise.all(
        files.slice(i, i + 200).map(async (f) => {
          const lang = LANGUAGE_BY_EXT.get(f.split('.').pop()?.toLowerCase() ?? '');
          if (!lang) return;
          try {
            const { size } = await fs.stat(path.join(root, f));
            bytesByLang.set(lang, (bytesByLang.get(lang) ?? 0) + size);
          } catch {
            return;
          }
        }),
      );
    }

    const total = [...bytesByLang.values()].reduce((a, b) => a + b, 0);
    if (!total) return [];
    return [...bytesByLang.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, bytes]) => ({ id: name.toLowerCase(), name, percentage: Math.round((bytes / total) * 1000) / 10 }));
  },

  repoInfo: async (root: string) => {
    const check = await runGit(['rev-parse', '--is-inside-work-tree'], root);
    if (check.error || check.stdout.trim() !== 'true') return null;

    const [remoteRes, logRes, shortlogRes, branchListRes, currentRes] = await Promise.all([
      runGit(['config', '--get', 'remote.origin.url'], root),
      runGit(['log', '-1', '--pretty=format:%an|%ae|%at'], root),
      runGit(['shortlog', '-sn', '--all'], root),
      runGit(
        [
          'for-each-ref',
          '--sort=-committerdate',
          'refs/heads/',
          'refs/remotes/',
          '--format=%(refname)|%(committerdate:unix)',
        ],
        root,
      ),
      runGit(['rev-parse', '--abbrev-ref', 'HEAD'], root),
    ]);

    const repoUrl = remoteRes.stdout?.trim() || '';
    const author = !logRes.error && logRes.stdout ? logRes.stdout.split('|')[0] || '' : '';

    const contributors: { username: string }[] = [];
    if (!shortlogRes.error) {
      for (const line of lines(shortlogRes.stdout).slice(0, 5)) {
        const match = line.match(/^\s*\d+\s+(.+)$/);
        const namePart = match?.[1].split('<')[0].trim();
        if (namePart) contributors.push({ username: namePart });
      }
    }

    const branches: { name: string; lastCommitDate: number; commitCount: number; isCurrent: boolean }[] = [];
    if (!branchListRes.error) {
      const seen = new Set<string>();
      const refs: { ref: string; name: string; ts: string }[] = [];
      for (const line of lines(branchListRes.stdout)) {
        const [ref, tsStr] = line.split('|');
        const name = ref.startsWith('refs/heads/')
          ? ref.slice('refs/heads/'.length)
          : ref.replace(/^refs\/remotes\/[^/]+\//, '');
        if (!name || name === 'HEAD' || seen.has(name)) continue;
        seen.add(name);
        refs.push({ ref, name, ts: tsStr });
      }
      const currentBranch = currentRes.stdout?.trim() || '';
      refs.sort((a, b) => Number(b.name === currentBranch) - Number(a.name === currentBranch));

      for (const { ref, name, ts } of refs.slice(0, 20)) {
        const countRes = await runGit(['rev-list', '--count', ref], root);
        const count = parseInt(countRes.stdout?.trim() || '0', 10);
        branches.push({
          name,
          lastCommitDate: (parseInt(ts, 10) || 0) * 1000,
          commitCount: isNaN(count) ? 0 : count,
          isCurrent: name === currentBranch,
        });
      }
    }

    return { repoUrl, author, contributors, branches };
  },
};