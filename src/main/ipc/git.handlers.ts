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

export function setupGitHandlers(): void {
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

      return { branches };
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
      const [remoteRes, logRes, shortlogRes, branchListRes] = await Promise.all([
        runGit(['config', '--get', 'remote.origin.url'], cwd),
        runGit(['log', '-1', '--pretty=format:%an|%ae|%at'], cwd), // Last commit author/email/time
        runGit(['shortlog', '-sn', '--all'], cwd), // Top contributors
        runGit(
          [
            'for-each-ref',
            '--sort=-committerdate',
            'refs/heads/',
            '--format=%(refname:short)|%(committerdate:unix)',
          ],
          cwd,
        ), // Local branches sorted by date
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
      const branches: { name: string; lastCommitDate: number; commitCount: number }[] = [];
      if (!branchListRes.error && branchListRes.stdout) {
        const lines = branchListRes.stdout.split('\n').filter((l) => l.trim());

        // Fetch commit counts sequentially to avoid overwhelming git process with too many parallel spawns
        // Optimization: Limit to top 10 most recent branches for display speed
        const topBranches = lines.slice(0, 10);

        for (const line of topBranches) {
          const [name, tsStr] = line.split('|');
          if (!name) continue;

          const countRes = await runGit(['rev-list', '--count', name], cwd);
          const count = parseInt(countRes.stdout?.trim() || '0', 10);

          branches.push({
            name: name.trim(),
            lastCommitDate: (parseInt(tsStr, 10) || 0) * 1000, // Unix seconds to ms
            commitCount: isNaN(count) ? 0 : count,
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
}
