/**
 * ------------------------------------------------------------------
 * IPC handler Git
 * ------------------------------------------------------------------
 * IPC handler cho các thao tác Git trong tiến trình chính. Bọc
 * Git CLI cho các thao tác status, diff, commit, stage/unstage và
 * discard.
 *
 * Hàm chính:
 * - setupGitHandlers() : Đăng ký IPC handler git:
 * - runGit()           : Thực thi lệnh git và thu thập đầu ra
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
}