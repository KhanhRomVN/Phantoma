/**
 * ------------------------------------------------------------------
 * IPC Git Handlers
 * ------------------------------------------------------------------
 * Giao diện IPC cho việc quản lý repository Git cục bộ. Bao bọc trực tiếp
 * Git CLI thông qua child_process để cung cấp các tính năng như xem trạng thái,
 * so sánh khác biệt (diff), staging, unstaging, discard changes, commit
 * và lấy thông tin chi tiết về repo (branch, contributor).
 *
 * Channels:
 * - git:list-branches    : Liệt kê tất cả branch local và remote
 * - git:status           : Lấy trạng thái working tree, diff stats và unpushed commits
 * - git:diff             : Xem thay đổi giữa HEAD và working tree (hoặc staged)
 * - git:commit           : Tạo commit mới với message được cung cấp
 * - git:stage            : Thêm các file đã chọn vào staging area
 * - git:stage-all        : Stage toàn bộ thay đổi (git add -A)
 * - git:unstage          : Bỏ staging cho các file đã chọn
 * - git:unstage-all      : Unstage toàn bộ (git restore --staged .)
 * - git:discard          : Khôi phục file về trạng thái HEAD (bỏ thay đổi)
 * - git:discard-all      : Discard toàn bộ thay đổi chưa commit
 * - git:get-repo-info    : Tổng hợp thông tin repo (URL, author, contributors, branches)
 * - git:delete-branch    : Xóa hoàn toàn branch local cùng worktree liên kết (nếu có)
 *
 * Functions:
 * - setupGitHandlers() : Entry point đăng ký toàn bộ IPC handler nhóm 'git:'
 *
 * Utils:
 * - runGit()           : Low-level wrapper để spawn git process và capture output safely
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Electron ──
import { ipcMain } from 'electron';

// ── Node.js ──
import { execFile } from 'child_process';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { basename, dirname, join, resolve } from 'path';

// ── Internal ──
import { logger } from '../utils/logger';

// ─── Functions ──────────────────────────────────────────────────────────
/** Run a git command via execFile (no shell) and resolve with stdout/stderr. */
function runGit(
  args: string[],
  cwd: string,
): Promise<{ stdout: string; stderr: string; error?: any }> {
  return new Promise((resolve) => {
    execFile(
      'git',
      args,
      { cwd, maxBuffer: 10 * 1024 * 1024 },
      (err: any, stdout: string, stderr: string) => {
        if (err) resolve({ stdout: '', stderr, error: err });
        else resolve({ stdout, stderr });
      },
    );
  });
}

/** Copy a file/folder with native `cp -a --reflink=auto` (fast, CoW when supported). Resolves false on any failure so callers can fall back. */
function copyFast(src: string, dest: string): Promise<boolean> {
  return new Promise((resolve) => {
    execFile('cp', ['-a', '--reflink=auto', '--', src, dest], (err) => resolve(!err));
  });
}

export function setupGitHandlers(): void {
  // ── Commit Diff ──
  ipcMain.handle('git:commit-diff', async (_event, projectPath: string, hash: string) => {
    try {
      const result = await runGit(
        ['show', '--format=', '--no-color', '-M', '--patch', hash],
        projectPath || process.cwd(),
      );
      if (result.error) return { error: result.stderr || result.error.message };
      return { diff: result.stdout };
    } catch (e: any) {
      logger.error('[git:commit-diff] Error:', e);
      return { error: e.message || String(e) };
    }
  });

  // ── Clone ──
  ipcMain.handle(
    'git:clone',
    async (_event, payload: { url: string; dest: string; branch?: string }) => {
      const { url, dest, branch } = payload;
      const args = ['clone', ...(branch ? ['--branch', branch] : []), '--', url, dest];
      const result = await runGit(args, process.cwd());
      if (result.error) throw new Error(result.stderr || result.error.message);
      return { ok: true };
    },
  );

  // ── Checkout ──
  ipcMain.handle('git:checkout', async (_event, projectPath: string, branch: string) => {
    try {
      const cwd = projectPath || process.cwd();
      let args = ['checkout', branch];
      if (branch.startsWith('origin/')) {
        const localName = branch.slice('origin/'.length);
        const exists = await runGit(['show-ref', '--verify', '--quiet', `refs/heads/${localName}`], cwd);
        args = exists.error ? ['checkout', '--track', branch] : ['checkout', localName];
      }
      const result = await runGit(args, cwd);
      if (result.error) return { error: result.stderr || result.error.message };
      return { ok: true };
    } catch (e: any) {
      logger.error('[git:checkout] Error:', e);
      return { error: e.message || String(e) };
    }
  });

  // ── Fetch / Pull / Push ──
  const registerRemoteOp = (channel: string, args: string[]) => {
    ipcMain.handle(channel, async (_event, projectPath: string) => {
      try {
        const result = await runGit(args, projectPath || process.cwd());
        if (result.error) return { error: result.stderr || result.error.message };
        return { ok: true, output: result.stdout };
      } catch (e: any) {
        logger.error(`[${channel}] Error:`, e);
        return { error: e.message || String(e) };
      }
    });
  };
  registerRemoteOp('git:fetch', ['fetch', '--all', '--prune']);
  registerRemoteOp('git:pull', ['pull']);
  registerRemoteOp('git:push', ['push']);

  // ── Resolve Ref ──
  ipcMain.handle('git:resolve-ref', async (_event, projectPath: string, ref: string) => {
    try {
      const result = await runGit(['rev-parse', '--verify', `${ref}^{commit}`], projectPath || process.cwd());
      if (result.error) return { error: result.stderr || result.error.message };
      return { hash: result.stdout.trim() };
    } catch (e: any) {
      return { error: e.message || String(e) };
    }
  });

  // ── Sync Info (header bar) ──
  ipcMain.handle('git:sync-info', async (_event, projectPath: string) => {
    try {
      const cwd = projectPath || process.cwd();
      const [branchRes, countRes, statusRes, stashRes] = await Promise.all([
        runGit(['rev-parse', '--abbrev-ref', 'HEAD'], cwd),
        runGit(['rev-list', '--left-right', '--count', '@{u}...HEAD'], cwd),
        runGit(['status', '--porcelain'], cwd),
        runGit(['stash', 'list'], cwd),
      ]);
      if (branchRes.error) return { error: branchRes.stderr || branchRes.error.message };

      const [behind, ahead] = countRes.error
        ? [0, 0]
        : countRes.stdout.trim().split(/\s+/).map((n) => parseInt(n, 10) || 0);
      const lines = statusRes.stdout.split('\n').filter((l) => l.length > 0);
      const staged = lines.filter((l) => l[0] !== ' ' && l[0] !== '?').length;

      return {
        branch: branchRes.stdout.trim(),
        hasUpstream: !countRes.error,
        ahead,
        behind,
        changed: lines.length,
        staged,
        stashes: stashRes.stdout.split('\n').filter((l) => l.trim().length > 0).length,
      };
    } catch (e: any) {
      logger.error('[git:sync-info] Error:', e);
      return { error: e.message || String(e) };
    }
  });

  // ── Log (commit graph) ──
  ipcMain.handle('git:log', async (_event, projectPath: string, limit?: number, ref?: string) => {
    try {
      const cwd = projectPath || process.cwd();
      const result = await runGit(
        [
          'log',
          ...(ref ? [ref] : ['--all']),
          '--date-order',
          `--max-count=${limit ?? 300}`,
          '--format=%H%x1f%P%x1f%an%x1f%ae%x1f%at%x1f%D%x1f%s',
        ],
        cwd,
      );
      if (result.error) return { error: result.stderr || result.error.message };

      const commits = result.stdout
        .split('\n')
        .filter((line) => line.trim().length > 0)
        .map((line) => {
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
    } catch (e: any) {
      logger.error('[git:log] Error:', e);
      return { error: e.message || String(e) };
    }
  });

  // ── Commit Files ──
  ipcMain.handle('git:commit-files', async (_event, projectPath: string, hash: string) => {
    try {
      const cwd = projectPath || process.cwd();
      const result = await runGit(['show', '--numstat', '--format=', hash], cwd);
      if (result.error) return { error: result.stderr || result.error.message };

      const files = result.stdout
        .split('\n')
        .filter((line) => line.trim().length > 0)
        .map((line) => {
          const parts = line.split('\t');
          return {
            added: parseInt(parts[0], 10) || 0,
            deleted: parseInt(parts[1], 10) || 0,
            path: parts.slice(2).join('\t'),
          };
        });
      return { files };
    } catch (e: any) {
      logger.error('[git:commit-files] Error:', e);
      return { error: e.message || String(e) };
    }
  });

  // ── List Branches ──
  ipcMain.handle('git:list-branches', async (_event, projectPath: string) => {
    try {
      const cwd = projectPath || process.cwd();

      // Get all branches (local and remote), formatted as short names
      // Using --format="%(refname:short)" gives clean names like "main", "feature/x"
      // Filtering out remotes/HEAD to avoid duplicates/confusion
      const result = await runGit(['branch', '-a', '--format=%(refname:short)'], cwd);

      if (result.error) {
        return { error: result.stderr || result.error.message };
      }

      const branches = result.stdout
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith('remotes/origin/HEAD'));

      const worktreePaths: Record<string, string> = {};
      const wtList = await runGit(['worktree', 'list', '--porcelain'], cwd);
      if (!wtList.error) {
        const mainRoot = resolve(cwd);
        for (const block of wtList.stdout.split(/\n\s*\n/)) {
          const lines = block.split('\n');
          const wtPath = lines.find((l) => l.startsWith('worktree '))?.slice(9).trim();
          const ref = lines.find((l) => l.startsWith('branch '))?.slice(7).trim();
          if (!wtPath || !ref || resolve(wtPath) === mainRoot) continue;
          worktreePaths[ref.replace(/^refs\/heads\//, '')] = wtPath;
        }
      }

      return { branches, worktreePaths };
    } catch (e: any) {
      logger.error('[git:list-branches] Error:', e);
      return { error: e.message || String(e) };
    }
  });

  // ── Status ──
  ipcMain.handle('git:status', async (_event, projectPath?: string) => {
    try {
      const cwd = projectPath || process.cwd();

      const [statusResult, diffResult, diffCachedResult, unpushedResult, branchResult] =
        await Promise.all([
          runGit(['status', '--porcelain'], cwd),
          runGit(['diff', '--numstat'], cwd),
          runGit(['diff', '--cached', '--numstat'], cwd),
          runGit(['log', 'origin/HEAD..HEAD', '--oneline'], cwd),
          runGit(['rev-parse', '--abbrev-ref', 'HEAD'], cwd),
        ]);

      if (statusResult.error) {
        if (statusResult.error.code === 'ENOENT') {
          return { error: 'Git is not installed or not in PATH.' };
        }
        return { error: statusResult.stderr || statusResult.error.message || 'Git status failed' };
      }

      const diffStats: Record<string, { added: number; deleted: number }> = {};
      const parseDiff = (output: string) => {
        output
          .split('\n')
          .filter((l) => l.trim())
          .forEach((line) => {
            const parts = line.split('\t');
            if (parts.length >= 3) {
              const fp = parts.slice(2).join('\t').trim();
              if (fp)
                diffStats[fp] = {
                  added: parseInt(parts[0], 10) || 0,
                  deleted: parseInt(parts[1], 10) || 0,
                };
            }
          });
      };
      parseDiff(diffResult.stdout);
      parseDiff(diffCachedResult.stdout);

      const unpushedCommits = unpushedResult.stdout
        .split('\n')
        .filter((l: string) => l.trim().length > 0);
      const branch = branchResult.stdout?.trim() || '';

      return { output: statusResult.stdout, diffStats, unpushedCommits, branch };
    } catch (e: any) {
      logger.error('[git:status] Error:', e);
      return { error: e.message || String(e) };
    }
  });

  // ── Diff ──
  ipcMain.handle(
    'git:diff',
    async (_event, projectPath: string, filePath?: string, staged?: boolean) => {
      try {
        const cwd = projectPath || process.cwd();
        const args = ['diff'];
        if (staged) args.push('--cached');
        if (filePath) args.push('--', filePath);
        const result = await runGit(args, cwd);
        if (result.error) return { error: result.stderr || result.error.message };
        return { output: result.stdout };
      } catch (e: any) {
        logger.error('[git:diff] Error:', e);
        return { error: e.message || String(e) };
      }
    },
  );

  // ── Commit ──
  ipcMain.handle('git:commit', async (_event, projectPath: string, message: string) => {
    try {
      const cwd = projectPath || process.cwd();
      const result = await runGit(['commit', '-m', message], cwd);
      if (result.error) return { error: result.stderr || result.error.message };
      return { success: true, output: result.stdout };
    } catch (e: any) {
      logger.error('[git:commit] Error:', e);
      return { error: e.message || String(e) };
    }
  });

  // ── Stage ──
  ipcMain.handle('git:stage', async (_event, projectPath: string, files: string[]) => {
    try {
      const cwd = projectPath || process.cwd();
      if (!files || files.length === 0) return { success: true };
      const result = await runGit(['add', '--', ...files], cwd);
      if (result.error) return { error: result.stderr || result.error.message };
      return { success: true };
    } catch (e: any) {
      logger.error('[git:stage] Error:', e);
      return { error: e.message || String(e) };
    }
  });

  ipcMain.handle('git:stage-all', async (_event, projectPath: string) => {
    try {
      const cwd = projectPath || process.cwd();
      const result = await runGit(['add', '-A'], cwd);
      if (result.error) return { error: result.stderr || result.error.message };
      return { success: true };
    } catch (e: any) {
      logger.error('[git:stage-all] Error:', e);
      return { error: e.message || String(e) };
    }
  });

  // ── Check Ready (workspace có .git + có staged chưa) ──
  ipcMain.handle('git:check-ready', async (_event, projectPath: string) => {
    try {
      const cwd = projectPath || process.cwd();
      const inside = await runGit(['rev-parse', '--is-inside-work-tree'], cwd);
      const hasGit = !inside.error && inside.stdout.trim() === 'true';
      if (!hasGit) {
        return { hasGit: false, hasStaged: false, reason: 'Workspace is not a git repository' };
      }
      const staged = await runGit(['diff', '--cached', '--name-only'], cwd);
      const hasStaged = !staged.error && staged.stdout.trim().length > 0;
      return {
        hasGit: true,
        hasStaged,
        reason: hasStaged ? undefined : 'No staged changes. Run git add first.',
      };
    } catch (e: any) {
      logger.error('[git:check-ready] Error:', e);
      return { hasGit: false, hasStaged: false, reason: e.message || String(e) };
    }
  });

  // ── Unstage ──
  ipcMain.handle('git:unstage', async (_event, projectPath: string, files: string[]) => {
    try {
      const cwd = projectPath || process.cwd();
      if (!files || files.length === 0) return { success: true };
      const result = await runGit(['restore', '--staged', '--', ...files], cwd);
      if (result.error) return { error: result.stderr || result.error.message };
      return { success: true };
    } catch (e: any) {
      logger.error('[git:unstage] Error:', e);
      return { error: e.message || String(e) };
    }
  });

  ipcMain.handle('git:unstage-all', async (_event, projectPath: string) => {
    try {
      const cwd = projectPath || process.cwd();
      const result = await runGit(['restore', '--staged', '--', '.'], cwd);
      if (result.error) return { error: result.stderr || result.error.message };
      return { success: true };
    } catch (e: any) {
      logger.error('[git:unstage-all] Error:', e);
      return { error: e.message || String(e) };
    }
  });

  // ── Discard ──
  ipcMain.handle(
    'git:discard',
    async (
      _event,
      projectPath: string,
      files: string[],
      opts: { staged?: boolean; untracked?: boolean } = {},
    ) => {
      try {
        const cwd = projectPath || process.cwd();
        if (!files || files.length === 0) return { success: true };

        if (opts.staged) {
          // Bỏ staging + reset working tree
          const result = await runGit(['restore', '--staged', '--worktree', '--', ...files], cwd);
          if (result.error) return { error: result.stderr || result.error.message };
        } else if (opts.untracked) {
          // Xóa file untracked
          const result = await runGit(['clean', '-f', '-d', '--', ...files], cwd);
          if (result.error) return { error: result.stderr || result.error.message };
        } else {
          // Reset working tree về HEAD
          const result = await runGit(['restore', '--', ...files], cwd);
          if (result.error) return { error: result.stderr || result.error.message };
        }
        return { success: true };
      } catch (e: any) {
        logger.error('[git:discard] Error:', e);
        return { error: e.message || String(e) };
      }
    },
  );

  ipcMain.handle(
    'git:discard-all',
    async (_event, projectPath: string, opts: { staged?: boolean } = {}) => {
      try {
        const cwd = projectPath || process.cwd();
        if (opts.staged) {
          const result = await runGit(['restore', '--staged', '--worktree', '--', '.'], cwd);
          if (result.error) return { error: result.stderr || result.error.message };
        } else {
          const result = await runGit(['restore', '--', '.'], cwd);
          if (result.error) return { error: result.stderr || result.error.message };
          // Xóa untracked files
          await runGit(['clean', '-f', '-d'], cwd);
        }
        return { success: true };
      } catch (e: any) {
        logger.error('[git:discard-all] Error:', e);
        return { error: e.message || String(e) };
      }
    },
  );

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

  // Extension-based byte count of tracked files — upgrade path: use github-linguist for content-based detection
  ipcMain.handle('git:get-language-stats', async (_event, projectPath: string) => {
    const list = await runGit(['ls-files', '-z'], projectPath);
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
            const { size } = await fs.stat(join(projectPath, f));
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
      .map(([name, bytes]) => ({
        id: name.toLowerCase(),
        name,
        percentage: Math.round((bytes / total) * 1000) / 10,
      }));
  });

  /**
   * Get comprehensive Git info for Project Detail Panel
   * Returns: repoUrl, author, contributors (top 5), branches (with dates & counts)
   */
  ipcMain.handle('git:get-repo-info', async (_event, projectPath: string) => {
    const cwd = projectPath;

    // Quick check if it's a git repo
    const checkResult = await runGit(['rev-parse', '--is-inside-work-tree'], cwd);
    if (checkResult.error || checkResult.stdout.trim() !== 'true') {
      logger.warn(
        `[git:get-repo-info] Not a valid git repo or error checking: ${checkResult.stderr || checkResult.error}`,
      );
      return null; // Not a git repo
    }

    try {
      // Run commands in parallel for performance
      const [remoteRes, logRes, shortlogRes, branchListRes, currentRes] = await Promise.all([
        runGit(['config', '--get', 'remote.origin.url'], cwd),
        runGit(['log', '-1', '--pretty=format:%an|%ae|%at'], cwd), // Last commit author/email/time
        runGit(['shortlog', '-sn', '--all'], cwd), // Top contributors
        runGit(
          [
            'for-each-ref',
            '--sort=-committerdate',
            'refs/heads/',
            'refs/remotes/',
            '--format=%(refname)|%(committerdate:unix)',
          ],
          cwd,
        ),
        runGit(['rev-parse', '--abbrev-ref', 'HEAD'], cwd),
      ]);

      // 1. Parse Repo URL
      const repoUrl = remoteRes.stdout?.trim() || '';

      // 2. Parse Author Info (from last commit as proxy)
      let author = '';
      if (!logRes.error && logRes.stdout) {
        const parts = logRes.stdout.split('|');
        author = parts[0] || ''; // Name
      }

      // 3. Parse Contributors (Top 5)
      const contributors: { username: string }[] = [];
      if (!shortlogRes.error && shortlogRes.stdout) {
        const lines = shortlogRes.stdout.split('\n').filter((l) => l.trim());
        // Format: "   123 John Doe" or "     5 Jane Smith <email>"
        lines.slice(0, 5).forEach((line) => {
          const match = line.match(/^\s*\d+\s+(.+)$/);
          if (match) {
            // Remove email part if present "Name <email>" -> "Name"
            const namePart = match[1].split('<')[0].trim();
            if (namePart) contributors.push({ username: namePart });
          }
        });
      }

      // 4. Parse Branches
      const branches: {
        name: string;
        lastCommitDate: number;
        commitCount: number;
        isCurrent: boolean;
      }[] = [];
      if (!branchListRes.error && branchListRes.stdout) {
        const lines = branchListRes.stdout.split('\n').filter((l) => l.trim());

        const seen = new Set<string>();
        const refs: { ref: string; name: string; ts: string }[] = [];
        for (const line of lines) {
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
          const countRes = await runGit(['rev-list', '--count', ref], cwd);
          const count = parseInt(countRes.stdout?.trim() || '0', 10);

          branches.push({
            name,
            lastCommitDate: (parseInt(ts, 10) || 0) * 1000,
            commitCount: isNaN(count) ? 0 : count,
            isCurrent: name === currentBranch,
          });
        }
      }

      const finalResult = {
        repoUrl,
        author,
        contributors,
        branches,
      };

      return finalResult;
    } catch (e: any) {
      logger.error('[git:get-repo-info] Critical Error:', e);
      return null;
    }
  });


  // ── Repo identity (so sánh 2 project có cùng repo không) ──
  ipcMain.handle('git:repo-identity', async (_event, projectPath: string) => {
    const cwd = projectPath || process.cwd();
    const common = await runGit(['rev-parse', '--path-format=absolute', '--git-common-dir'], cwd);
    if (common.error) return null;
    const [remote, branch] = await Promise.all([
      runGit(['config', '--get', 'remote.origin.url'], cwd),
      runGit(['branch', '--show-current'], cwd),
    ]);
    return {
      commonDir: resolve(common.stdout.trim()),
      remoteUrl: remote.stdout?.trim() || '',
      branch: branch.stdout?.trim() || '',
    };
  });

  // ── Is Repo (kiểm tra project có git hay không) ──
  ipcMain.handle('git:is-repo', async (_event, projectPath: string) => {
    const res = await runGit(['rev-parse', '--is-inside-work-tree'], projectPath || process.cwd());
    return !res.error && res.stdout.trim() === 'true';
  });

  const previewCancels = new Set<string>();
  ipcMain.handle('git:worktree-preview-cancel', (_event, requestId: string) => {
    previewCancels.add(requestId);
    return true;
  });

  // ── Worktree Preview (dữ liệu cho modal confirm tạo branch) ──
  ipcMain.handle(
    'git:worktree-preview',
    async (_event, projectPath: string, requestId?: string, withSizes = true) => {
    const cwd = projectPath || process.cwd();
    const content = await fs.readFile(join(cwd, '.gitignore'), 'utf8').catch(() => null);
    const status = await runGit(['status', '--porcelain'], cwd);
    const changedFiles = status.error
      ? 0
      : status.stdout.split('\n').filter((l) => l.trim()).length;
    if (!withSizes) {
      return { ignoredPaths: [] as string[], hasGitignore: content !== null, changedFiles };
    }
    const ignored = await runGit(
      ['ls-files', '--others', '--ignored', '--exclude-standard', '--directory', '-z'],
      cwd,
    );
    const ignoredPaths = ignored.error
      ? []
      : ignored.stdout.split('\0').filter((p) => p.length > 0);
    const isCancelled = () => !!requestId && previewCancels.has(requestId);
    let scanned = 0;
    let doneCount = 0;
    let lastReport = 0;
    const report = (label: string, force = false) => {
      if (!requestId) return;
      const now = Date.now();
      if (!force && now - lastReport < 100) return;
      lastReport = now;
      _event.sender.send('git:worktree-preview-progress', {
        requestId,
        done: doneCount,
        total: ignoredPaths.length,
        scanned,
        label,
      });
    };
    const sizeOf = async (root: string, label: string): Promise<number> => {
      let total = 0;
      const stack = [root];
      while (stack.length) {
        if (isCancelled()) break;
        const cur = stack.pop() as string;
        scanned++;
        report(label);
        const st = await fs.lstat(cur).catch(() => null);
        if (!st) continue;
        if (st.isDirectory()) {
          const entries = await fs.readdir(cur).catch(() => [] as string[]);
          for (const e of entries) stack.push(join(cur, e));
        } else {
          total += st.size;
        }
      }
      return total;
    };
    const sizes: Record<string, number> = {};
    await Promise.all(
      ignoredPaths.map(async (p) => {
        const size = await sizeOf(join(cwd, p), p);
        if (!isCancelled()) sizes[p] = size;
        doneCount++;
        report(p, true);
      }),
    );
    const cancelled = isCancelled();
    if (requestId) previewCancels.delete(requestId);
    return {
      ignoredPaths,
      hasGitignore: content !== null,
      changedFiles,
      ...(cancelled ? { cancelled: true } : { sizes }),
    };
    },
  );

  // ── Create Branch (git worktree) ──
  ipcMain.handle(
    'git:create-branch-worktree',
    async (
      _event,
      projectPath: string,
      newBranch: string,
      sourceBranch: string,
      mode: 'latest-commit' | 'local' | 'commit',
      copyPaths: string[] = [],
      targetDir?: string,
      useExisting = false,
      commitSha?: string,
    ) => {
      const cwd = projectPath || process.cwd();
      const name = (newBranch || '').trim();
      let rollback: (() => Promise<void>) | null = null;
      try {
        const report = (p: {
          step: 'worktree' | 'local' | 'copy';
          current?: number;
          total?: number;
          label?: string;
        }) => _event.sender.send('git:create-branch-progress', p);
        report({ step: 'worktree' });

        const isRepo = await runGit(['rev-parse', '--is-inside-work-tree'], cwd);
        if (isRepo.error) return { error: 'Project này chưa có git repository' };

        const formatCheck = await runGit(['check-ref-format', '--branch', name], cwd);
        if (formatCheck.error) return { error: `Tên branch không hợp lệ: ${name}` };

        const existing = await runGit(['show-ref', '--verify', '--quiet', `refs/heads/${name}`], cwd);
        let remoteRef: string | null = null;
        if (useExisting) {
          if (existing.error) {
            const remote = await runGit(
              ['show-ref', '--verify', '--quiet', `refs/remotes/origin/${name}`],
              cwd,
            );
            if (remote.error) return { error: `Branch "${name}" không tồn tại` };
            remoteRef = `origin/${name}`;
          }
        } else {
          if (!existing.error) return { error: `Branch "${name}" đã tồn tại` };
          const source = await runGit(
            [
              'show-ref',
              '--verify',
              '--quiet',
              `refs/${sourceBranch.startsWith('origin/') ? 'remotes' : 'heads'}/${sourceBranch}`,
            ],
            cwd,
          );
          if (source.error) return { error: `Branch nguồn "${sourceBranch}" không tồn tại` };
        }

        if (mode === 'commit') {
          const sha = (commitSha || '').trim();
          if (!/^[0-9a-f]{7,40}$/i.test(sha)) return { error: 'Commit không hợp lệ' };
          const verify = await runGit(['rev-parse', '--verify', '--quiet', `${sha}^{commit}`], cwd);
          if (verify.error) return { error: `Commit "${sha}" không tồn tại` };
        }

        if (mode === 'local') {
          const current = await runGit(['branch', '--show-current'], cwd);
          if (current.stdout.trim() !== sourceBranch) {
            return { error: 'Chế độ Local chỉ dùng được khi branch nguồn đang được checkout' };
          }
        }

        // ASSUMED: mặc định lưu cùng cấp với project (thư mục cha); '/' trong tên branch đổi thành '-' để không tạo thư mục lồng
        const projectRoot = resolve(cwd);
        const baseDir = targetDir?.trim() ? resolve(targetDir.trim()) : dirname(projectRoot);
        const targetPath = join(baseDir, `${basename(projectRoot)}-${name.replace(/\//g, '-')}`);
        if (await fs.lstat(targetPath).catch(() => null)) {
          return { error: `Thư mục "${targetPath}" đã tồn tại` };
        }
        const add = await runGit(
          useExisting
            ? remoteRef
              ? ['worktree', 'add', '--track', '-b', name, targetPath, remoteRef]
              : ['worktree', 'add', targetPath, name]
            : [
                'worktree',
                'add',
                '-b',
                name,
                targetPath,
                mode === 'commit' && commitSha ? commitSha.trim() : sourceBranch,
              ],
          cwd,
        );
        if (add.error) return { error: add.stderr || add.error.message };

        rollback = async () => {
          const prevNoAsar = process.noAsar;
          process.noAsar = true;
          try {
            await fs.rm(targetPath, { recursive: true, force: true });
          } finally {
            process.noAsar = prevNoAsar;
          }
          await runGit(['worktree', 'prune'], cwd);
          if (!useExisting || remoteRef) await runGit(['branch', '-D', name], cwd);
        };

        if (mode === 'local') {
          report({ step: 'local' });
          const patchFile = join(tmpdir(), `phantoma-${Date.now()}.patch`);
          const diff = await runGit(['diff', 'HEAD', '--binary', '--output', patchFile], cwd);
          if (!diff.error) {
            const stat = await fs.stat(patchFile).catch(() => null);
            if (stat && stat.size > 0) {
              const apply = await runGit(['apply', '--whitespace=nowarn', patchFile], targetPath);
              if (apply.error) logger.error('[git:create-branch-worktree] apply failed:', apply.stderr);
            }
            await fs.rm(patchFile, { force: true });
          }

          const untracked = await runGit(['ls-files', '--others', '--exclude-standard', '-z'], cwd);
          const files = untracked.stdout.split('\0').filter((f) => f.length > 0);
          for (const file of files) {
            const dest = join(targetPath, file);
            await fs.mkdir(dirname(dest), { recursive: true });
            await fs.copyFile(join(cwd, file), dest);
          }
        }

        for (const [i, raw] of copyPaths.entries()) {
          report({ step: 'copy', current: i + 1, total: copyPaths.length, label: raw });
          const rel = raw.replace(/\/+$/, '');
          if (!rel || rel.startsWith('/') || rel.split('/').includes('..')) continue;
          const src = join(cwd, rel);
          const dest = join(targetPath, rel);
          const stat = await fs.stat(src).catch(() => null);
          if (!stat || (await fs.lstat(dest).catch(() => null))) continue;
          await fs.mkdir(dirname(dest), { recursive: true });
          if (await copyFast(src, dest)) continue;
          if (stat.isDirectory()) {
            // Electron's fs treats *.asar as archives (e.g. electron/dist/resources/default_app.asar) and cp fails on them
            const prevNoAsar = process.noAsar;
            process.noAsar = true;
            try {
              await fs.cp(src, dest, { recursive: true });
            } finally {
              process.noAsar = prevNoAsar;
            }
          } else await fs.copyFile(src, dest);
        }

        return { branch: name, path: targetPath };
      } catch (e: any) {
        logger.error('[git:create-branch-worktree] Error:', e);
        await rollback?.().catch((re) =>
          logger.error('[git:create-branch-worktree] Rollback failed:', re),
        );
        return { error: e.message || String(e) };
      }
    },
  );

  // ── Delete Branch (branch + worktree) ──
  ipcMain.handle('git:delete-branch', async (_event, projectPath: string, branchName: string) => {
    try {
      const cwd = projectPath || process.cwd();
      const name = (branchName || '').trim();
      if (!name) return { error: 'Thiếu tên branch' };

      const exists = await runGit(['show-ref', '--verify', '--quiet', `refs/heads/${name}`], cwd);
      if (exists.error) return { error: `Branch "${name}" không tồn tại` };

      const current = await runGit(['branch', '--show-current'], cwd);
      if (current.stdout.trim() === name) {
        return { error: `Không thể xóa branch "${name}" đang được checkout` };
      }

      const originHead = await runGit(['symbolic-ref', '--short', 'refs/remotes/origin/HEAD'], cwd);
      const defaultBranch = originHead.error ? '' : originHead.stdout.trim().replace(/^origin\//, '');
      if (name === defaultBranch || (!defaultBranch && (name === 'main' || name === 'master'))) {
        return { error: `Không thể xóa branch mặc định "${name}"` };
      }

      const list = await runGit(['worktree', 'list', '--porcelain'], cwd);
      const blocks = list.stdout.split(/\n\s*\n/).slice(1);
      for (const block of blocks) {
        const lines = block.split('\n').map((l) => l.trim());
        if (!lines.includes(`branch refs/heads/${name}`)) continue;
        const wtLine = lines.find((l) => l.startsWith('worktree '));
        if (!wtLine) continue;
        const remove = await runGit(['worktree', 'remove', '--force', wtLine.slice(9)], cwd);
        if (remove.error) return { error: remove.stderr || remove.error.message };
      }

      const del = await runGit(['branch', '-D', name], cwd);
      if (del.error) return { error: del.stderr || del.error.message };

      await runGit(['worktree', 'prune'], cwd);
      return { branch: name };
    } catch (e: any) {
      logger.error('[git:delete-branch] Error:', e);
      return { error: e.message || String(e) };
    }
  });

  // ── Branch Sync (pull changed files from another branch, skipping gitignored paths) ──
  const readBranchDiff = async (cwd: string, ref: string) => {
    if (!ref) return { error: 'Thiếu branch nguồn' };
    const verify = await runGit(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`], cwd);
    if (verify.error) return { error: `Branch nguồn "${ref}" không tồn tại` };
    const headSha = await runGit(['rev-parse', 'HEAD'], cwd);
    const refSha = await runGit(['rev-parse', `${ref}^{commit}`], cwd);
    const curBranch = await runGit(['branch', '--show-current'], cwd);
    logger.info?.('[DEBUG][readBranchDiff]', {
      cwd,
      ref,
      currentBranch: curBranch.stdout?.trim(),
      headSha: headSha.stdout?.trim(),
      refSha: refSha.stdout?.trim(),
      sameCommit: headSha.stdout?.trim() === refSha.stdout?.trim(),
    });
    const [names, nums] = await Promise.all([
      runGit(['diff', '-R', '--no-renames', '--name-status', '-z', ref, 'HEAD'], cwd),
      runGit(['diff', '-R', '--no-renames', '--numstat', '-z', ref, 'HEAD'], cwd),
    ]);
    if (names.error) return { error: names.stderr || names.error.message };
    const stats = new Map<string, { added: number; deleted: number }>();
    for (const rec of nums.stdout.split('\0')) {
      const [a, d, ...rest] = rec.split('\t');
      const p = rest.join('\t');
      if (p) stats.set(p, { added: parseInt(a, 10) || 0, deleted: parseInt(d, 10) || 0 });
    }
    const parts = names.stdout.split('\0').filter((s) => s.length > 0);
    const files: {
      path: string;
      status: 'added' | 'modified' | 'deleted';
      added: number;
      deleted: number;
    }[] = [];
    for (let i = 0; i + 1 < parts.length; i += 2) {
      const code = parts[i][0];
      const status = code === 'A' ? 'added' : code === 'D' ? 'deleted' : 'modified';
      const st = stats.get(parts[i + 1]) ?? { added: 0, deleted: 0 };
      files.push({ path: parts[i + 1], status, added: st.added, deleted: st.deleted });
    }
    const ignored = new Set<string>();
    for (let i = 0; i < files.length; i += 200) {
      const chunk = files.slice(i, i + 200).map((f) => f.path);
      const res = await runGit(['check-ignore', '--no-index', '-z', '--', ...chunk], cwd);
      res.stdout
        .split('\0')
        .filter(Boolean)
        .forEach((p) => ignored.add(p));
    }
    return { files: files.filter((f) => !ignored.has(f.path)) };
  };

  ipcMain.handle(
    'git:branch-sync-preview',
    async (_event, projectPath: string, sourceRef: string) => {
      try {
        return await readBranchDiff(projectPath || process.cwd(), (sourceRef || '').trim());
      } catch (e: any) {
        logger.error('[git:branch-sync-preview] Error:', e);
        return { error: e.message || String(e) };
      }
    },
  );

  ipcMain.handle(
    'git:branch-sync-apply',
    async (_event, projectPath: string, sourceRef: string, paths: string[]) => {
      try {
        const cwd = resolve(projectPath || process.cwd());
        const ref = (sourceRef || '').trim();
        const diff = await readBranchDiff(cwd, ref);
        if ('error' in diff) return diff;
        const wanted = new Set(paths ?? []);
        const targets = diff.files.filter((f) => wanted.has(f.path));
        const restore = targets
          .filter((f) => f.status !== 'deleted')
          .map((f) => `:(literal)${f.path}`);
        for (let i = 0; i < restore.length; i += 200) {
          const res = await runGit(
            ['restore', `--source=${ref}`, '--worktree', '--', ...restore.slice(i, i + 200)],
            cwd,
          );
          if (res.error) return { error: res.stderr || res.error.message };
        }
        for (const f of targets.filter((t) => t.status === 'deleted')) {
          await fs.rm(resolve(cwd, f.path), { force: true });
        }
        return { applied: targets.length };
      } catch (e: any) {
        logger.error('[git:branch-sync-apply] Error:', e);
        return { error: e.message || String(e) };
      }
    },
  );
}
