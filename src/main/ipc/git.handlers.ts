/**
 * ------------------------------------------------------------------
 * IPC handler Git
 * ------------------------------------------------------------------
 * IPC handler cho các thao tác Git trong tiến trình chính. Bọc
 * Git CLI cho các thao tác status, diff và commit.
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
import { exec as execCallback } from 'child_process';

// ── Internal ──
import { logger } from '../utils/logger';

// ─── Functions ──────────────────────────────────────────────────────────
function runGit(args: string[], cwd: string): Promise<{ stdout: string; stderr: string; error?: any }> {
  return new Promise((resolve) => {
    const cmd = 'git ' + args.join(' ');
    execCallback(cmd, { cwd, maxBuffer: 10 * 1024 * 1024 }, (err: any, stdout: string, stderr: string) => {
      if (err) resolve({ stdout: '', stderr, error: err });
      else resolve({ stdout, stderr });
    });
  });
}

export function setupGitHandlers(): void {
  ipcMain.handle('git:status', async (_event) => {
    try {
      const cwd = process.cwd(); // fallback — caller nên truyền projectPath

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
        output.split('\n').filter((l) => l.trim()).forEach((line) => {
          const parts = line.split('\t');
          if (parts.length >= 3) {
            const fp = parts.slice(2).join('\t').trim();
            if (fp) diffStats[fp] = { added: parseInt(parts[0], 10) || 0, deleted: parseInt(parts[1], 10) || 0 };
          }
        });
      };
      parseDiff(diffResult.stdout);
      parseDiff(diffCachedResult.stdout);

      const unpushedCommits = unpushedResult.stdout.split('\n').filter((l: string) => l.trim().length > 0);
      const branch = branchResult.stdout?.trim() || '';

      return { output: statusResult.stdout, diffStats, unpushedCommits, branch };
    } catch (e: any) {
      logger.error('[git:status] Error:', e);
      return { error: e.message || String(e) };
    }
  });

  ipcMain.handle('git:diff', async (_event, filePath?: string) => {
    try {
      const cwd = process.cwd();
      const args = filePath ? ['diff', filePath] : ['diff'];
      const result = await runGit(args, cwd);
      if (result.error) return { error: result.stderr || result.error.message };
      return { output: result.stdout };
    } catch (e: any) {
      logger.error('[git:diff] Error:', e);
      return { error: e.message || String(e) };
    }
  });

  ipcMain.handle('git:commit', async (_event, message: string) => {
    try {
      const cwd = process.cwd();
      // Stage all changes first
      await runGit(['add', '-A'], cwd);
      const result = await runGit(['commit', '-m', message], cwd);
      if (result.error) return { error: result.stderr || result.error.message };
      return { success: true, output: result.stdout };
    } catch (e: any) {
      logger.error('[git:commit] Error:', e);
      return { error: e.message || String(e) };
    }
  });
}