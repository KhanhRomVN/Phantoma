/**
 * ------------------------------------------------------------------
 * IPC Pull Request Handlers
 * ------------------------------------------------------------------
 * Thao tác pull request GitHub thông qua GitHub CLI (gh). Không lưu token:
 * việc xác thực do `gh auth login` quản lý.
 *
 * Channels:
 * - pr:status        : gh đã cài / đã đăng nhập chưa, thông tin repo
 * - pr:list          : Danh sách PR theo state (open | closed | merged | all)
 * - pr:view          : Chi tiết PR (body, files, commits, reviews, checks)
 * - pr:diff          : Diff của PR
 * - pr:create        : Tạo PR từ branch (tùy chọn push trước)
 * - pr:merge         : Merge PR (merge | squash | rebase)
 * - pr:close         : Đóng PR (kèm comment tùy chọn)
 * - pr:reopen        : Mở lại PR đã đóng
 * - pr:ready         : Chuyển PR draft sang ready for review
 * - pr:comment       : Thêm comment vào PR
 * - pr:review        : approve | request-changes | comment
 * - pr:open-external : Mở URL https trong trình duyệt
 *
 * Functions:
 * - setupPullRequestHandlers() : Entry point đăng ký toàn bộ IPC handler nhóm 'pr:'
 *
 * Utils:
 * - runCmd()           : Spawn gh/git bằng execFile (không qua shell) và capture output
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Electron ──
import { ipcMain, shell } from 'electron';

// ── Node.js ──
import { execFile, spawn } from 'child_process';
import { dirname, resolve } from 'path';

// ── Internal ──
import { logger } from '../utils/logger';

// ─── Types ──────────────────────────────────────────────────────────────
type CmdResult = { stdout: string; stderr: string; error?: any };
type Failure = { error: string; code?: string };
type JsonResult = { ok: true; data: any } | { ok: false; failure: Failure };

// ─── Constants ──────────────────────────────────────────────────────────
const PR_LIST_FIELDS =
  'number,title,state,isDraft,author,headRefName,baseRefName,createdAt,updatedAt,url,reviewDecision,labels';
const PR_VIEW_FIELDS = `${PR_LIST_FIELDS},body,mergedAt,closedAt,mergeable,mergeStateStatus,additions,deletions,changedFiles,files,commits,reviews,comments,statusCheckRollup`;
const LIST_STATES = ['open', 'closed', 'merged', 'all'];
const MERGE_FLAGS: Record<string, string> = {
  merge: '--merge',
  squash: '--squash',
  rebase: '--rebase',
};
const REVIEW_FLAGS: Record<string, string> = {
  approve: '--approve',
  'request-changes': '--request-changes',
  comment: '--comment',
};

// ─── Functions ──────────────────────────────────────────────────────────
/** Run gh/git via execFile (no shell) and resolve with stdout/stderr. */
function runCmd(bin: 'gh' | 'git', args: string[], cwd: string): Promise<CmdResult> {
  const ceiling = dirname(resolve(cwd));
  return new Promise((done) => {
    execFile(
      bin,
      args,
      {
        cwd,
        maxBuffer: 20 * 1024 * 1024,
        env: {
          ...process.env,
          GIT_CEILING_DIRECTORIES: ceiling,
          GH_PROMPT_DISABLED: '1',
          NO_COLOR: '1',
        },
      },
      (err: any, stdout: string, stderr: string) => {
        if (err) {
          logger.error(
            `[DEBUG][pr] ${bin} ${args.join(' ')} (cwd=${cwd}) failed: code=${err.code} stderr=${String(stderr).trim()}`,
          );
          done({ stdout: '', stderr, error: err });
        } else done({ stdout, stderr });
      },
    );
  });
}

function fail(r: CmdResult): Failure {
  if (r.error?.code === 'ENOENT') {
    return { error: 'GitHub CLI (gh) is not installed', code: 'GH_NOT_INSTALLED' };
  }
  const text = (r.stderr || r.error?.message || 'gh failed').trim();
  if (/not logged in|gh auth login|authentication/i.test(text)) {
    return {
      error: 'Not logged in to GitHub. Run gh auth login in a terminal.',
      code: 'GH_NOT_AUTHENTICATED',
    };
  }
  if (/error connecting to github\.com|lookup .* permission denied/i.test(text)) {
    return {
      error:
        'gh cannot reach GitHub (DNS lookup denied). If gh was installed via snap, reinstall it from the official apt repo (cli.github.com).',
      code: 'GH_NETWORK',
    };
  }
  return { error: text };
}

async function ghJson(cwd: string, args: string[]): Promise<JsonResult> {
  const r = await runCmd('gh', args, cwd);
  if (r.error) return { ok: false, failure: fail(r) };
  try {
    return { ok: true, data: JSON.parse(r.stdout) };
  } catch {
    return { ok: false, failure: { error: 'Invalid response from gh' } };
  }
}

const isPrNumber = (n: unknown): n is number => Number.isInteger(n) && (n as number) > 0;

export function setupPullRequestHandlers(): void {
  // ── Status (gh installed / authenticated / repo) ──
  ipcMain.handle('pr:status', async (_event, projectPath: string) => {
    try {
      const cwd = projectPath || process.cwd();
      const version = await runCmd('gh', ['--version'], cwd);
      if (version.error?.code === 'ENOENT') return { installed: false, authenticated: false };
      const auth = await runCmd('gh', ['auth', 'status'], cwd);
      if (auth.error) return { installed: true, authenticated: false };
      const repo = await ghJson(cwd, ['repo', 'view', '--json', 'nameWithOwner,url,defaultBranchRef']);
      if (!repo.ok) {
        return { installed: true, authenticated: true, repoError: repo.failure.error };
      }
      return {
        installed: true,
        authenticated: true,
        repo: {
          nameWithOwner: repo.data.nameWithOwner,
          url: repo.data.url,
          defaultBranch: repo.data.defaultBranchRef?.name ?? '',
        },
      };
    } catch (e: any) {
      logger.error('[pr:status] Error:', e);
      return { error: e.message || String(e) };
    }
  });

  // ── Login with a personal access token (stdin, never logged) ──
  ipcMain.handle('pr:login-token', async (_event, projectPath: string, token: unknown) => {
    const t = typeof token === 'string' ? token.trim() : '';
    if (!t || /\s/.test(t)) return { error: 'Invalid token' };
    return new Promise((done) => {
      const p = spawn('gh', ['auth', 'login', '--hostname', 'github.com', '--with-token'], {
        cwd: projectPath || process.cwd(),
        env: { ...process.env, GH_PROMPT_DISABLED: '1', NO_COLOR: '1' },
      });
      let err = '';
      p.stderr.on('data', (d) => (err += String(d)));
      p.on('error', (e: any) =>
        done({ error: e?.code === 'ENOENT' ? 'GitHub CLI (gh) is not installed' : e.message }),
      );
      p.on('close', (code) =>
        done(code === 0 ? { ok: true } : { error: (err.trim() || 'Login failed').split('\n')[0] }),
      );
      p.stdin.on('error', () => {});
      p.stdin.end(t + '\n');
    });
  });

  // ── Login via browser device flow, fully in background (no terminal) ──
  let webLoginProc: ReturnType<typeof spawn> | null = null;
  const stopWebLogin = () => {
    webLoginProc?.kill();
    webLoginProc = null;
  };

  ipcMain.handle('pr:login-web', async (_event, projectPath: string) => {
    stopWebLogin();
    logger.info(
      `[DEBUG][pr:login-web] start cwd=${projectPath} PATH=${process.env.PATH} HTTPS_PROXY=${process.env.HTTPS_PROXY ?? process.env.https_proxy ?? ''} SNAP=${process.env.SNAP ?? ''}`,
    );
    return new Promise((done) => {
      const p = spawn(
        'gh',
        ['auth', 'login', '--hostname', 'github.com', '--git-protocol', 'https', '--web'],
        {
          cwd: projectPath || process.cwd(),
          env: { ...process.env, NO_COLOR: '1', BROWSER: 'true', GH_DEBUG: 'api' },
        },
      );
      logger.info(`[DEBUG][pr:login-web] spawned pid=${p.pid}`);
      webLoginProc = p;
      let out = '';
      let settled = false;
      const finish = (v: unknown) => {
        if (settled) return;
        settled = true;
        done(v);
      };
      const onData = (d: Buffer) => {
        logger.info(`[DEBUG][pr:login-web] output: ${String(d).trim()}`);
        out += String(d);
        const code = out.match(/\b[A-Z0-9]{4}-[A-Z0-9]{4}\b/)?.[0];
        if (code) finish({ code, url: 'https://github.com/login/device' });
      };
      p.stdout.on('data', onData);
      p.stderr.on('data', onData);
      p.on('error', (e: any) =>
        finish({ error: e?.code === 'ENOENT' ? 'GitHub CLI (gh) is not installed' : e.message }),
      );
      p.on('close', (code) => {
        logger.info(`[DEBUG][pr:login-web] closed code=${code}`);
        if (webLoginProc === p) webLoginProc = null;
        finish({ error: (out.trim() || 'Login failed').split('\n').pop() });
      });
      p.stdin.on('error', () => {});
      p.stdin.write('\n');
      setTimeout(() => finish({ error: 'Timed out waiting for GitHub code' }), 15000);
    });
  });

  ipcMain.handle('pr:login-web-cancel', async () => {
    stopWebLogin();
    return { ok: true };
  });

  // ── List ──
  ipcMain.handle(
    'pr:list',
    async (_event, projectPath: string, state: string = 'open', limit: number = 50) => {
      try {
        const s = LIST_STATES.includes(state) ? state : 'open';
        const n = Math.min(Math.max(Number(limit) || 50, 1), 200);
        const res = await ghJson(projectPath || process.cwd(), [
          'pr',
          'list',
          '--state',
          s,
          '--limit',
          String(n),
          '--json',
          PR_LIST_FIELDS,
        ]);
        if (!res.ok) return res.failure;
        return { prs: res.data };
      } catch (e: any) {
        logger.error('[pr:list] Error:', e);
        return { error: e.message || String(e) };
      }
    },
  );

  // ── View ──
  ipcMain.handle('pr:view', async (_event, projectPath: string, number: number) => {
    try {
      if (!isPrNumber(number)) return { error: 'Invalid pull request number' };
      const res = await ghJson(projectPath || process.cwd(), [
        'pr',
        'view',
        String(number),
        '--json',
        PR_VIEW_FIELDS,
      ]);
      if (!res.ok) return res.failure;
      return { pr: res.data };
    } catch (e: any) {
      logger.error('[pr:view] Error:', e);
      return { error: e.message || String(e) };
    }
  });

  // ── Diff ──
  ipcMain.handle('pr:diff', async (_event, projectPath: string, number: number) => {
    try {
      if (!isPrNumber(number)) return { error: 'Invalid pull request number' };
      const r = await runCmd('gh', ['pr', 'diff', String(number)], projectPath || process.cwd());
      if (r.error) return fail(r);
      return { diff: r.stdout };
    } catch (e: any) {
      logger.error('[pr:diff] Error:', e);
      return { error: e.message || String(e) };
    }
  });

  // ── Create ──
  ipcMain.handle(
    'pr:create',
    async (
      _event,
      projectPath: string,
      opts: {
        title: string;
        body?: string;
        base?: string;
        head?: string;
        draft?: boolean;
        push?: boolean;
      },
    ) => {
      try {
        const cwd = projectPath || process.cwd();
        const title = (opts?.title || '').trim();
        if (!title) return { error: 'Title is required' };
        let head = (opts.head || '').trim();
        if (!head) {
          const cur = await runCmd('git', ['branch', '--show-current'], cwd);
          head = cur.error ? '' : cur.stdout.trim();
        }
        if (!head) return { error: 'Cannot determine the branch to open the pull request from' };
        const base = (opts.base || '').trim();
        if (head.startsWith('-') || base.startsWith('-')) return { error: 'Invalid branch name' };
        if (base && base === head) {
          return { error: `Branch ${head} is the base branch. Create a feature branch first.` };
        }
        if (opts.push !== false) {
          const pushed = await runCmd('git', ['push', '-u', 'origin', head], cwd);
          if (pushed.error) return { error: (pushed.stderr || pushed.error.message).trim() };
        }
        const args = ['pr', 'create', '--title', title, '--body', opts.body ?? '', '--head', head];
        if (base) args.push('--base', base);
        if (opts.draft) args.push('--draft');
        const r = await runCmd('gh', args, cwd);
        if (r.error) return fail(r);
        const url = r.stdout.trim().split('\n').pop() ?? '';
        return { ok: true, url };
      } catch (e: any) {
        logger.error('[pr:create] Error:', e);
        return { error: e.message || String(e) };
      }
    },
  );

  // ── Simple actions: gh pr <verb> <number> [...] ──
  const registerAction = (channel: string, build: (...a: any[]) => string[] | Failure) => {
    ipcMain.handle(channel, async (_event, projectPath: string, ...rest: any[]) => {
      try {
        const args = build(...rest);
        if (!Array.isArray(args)) return args;
        const r = await runCmd('gh', args, projectPath || process.cwd());
        if (r.error) return fail(r);
        return { ok: true, output: r.stdout.trim() };
      } catch (e: any) {
        logger.error(`[${channel}] Error:`, e);
        return { error: e.message || String(e) };
      }
    });
  };
  const badNumber: Failure = { error: 'Invalid pull request number' };

  registerAction('pr:merge', (n, method: string = 'merge', deleteBranch: boolean = false) => {
    const flag = MERGE_FLAGS[method];
    if (!isPrNumber(n)) return badNumber;
    if (!flag) return { error: 'Invalid merge method' };
    const args = ['pr', 'merge', String(n), flag];
    if (deleteBranch) args.push('--delete-branch');
    return args;
  });

  registerAction('pr:close', (n, comment?: string) => {
    if (!isPrNumber(n)) return badNumber;
    const args = ['pr', 'close', String(n)];
    if (comment && comment.trim()) args.push('--comment', comment.trim());
    return args;
  });

  registerAction('pr:reopen', (n) => (isPrNumber(n) ? ['pr', 'reopen', String(n)] : badNumber));

  registerAction('pr:ready', (n) => (isPrNumber(n) ? ['pr', 'ready', String(n)] : badNumber));

  registerAction('pr:comment', (n, body: string) => {
    if (!isPrNumber(n)) return badNumber;
    if (!body || !body.trim()) return { error: 'Comment is empty' };
    return ['pr', 'comment', String(n), '--body', body.trim()];
  });

  registerAction('pr:review', (n, action: string, body?: string) => {
    const flag = REVIEW_FLAGS[action];
    if (!isPrNumber(n)) return badNumber;
    if (!flag) return { error: 'Invalid review action' };
    const text = (body || '').trim();
    if (action !== 'approve' && !text) return { error: 'A comment is required for this review' };
    const args = ['pr', 'review', String(n), flag];
    if (text) args.push('--body', text);
    return args;
  });

  // ── Open external URL ──
  ipcMain.handle('pr:open-external', async (_event, url: string) => {
    if (typeof url !== 'string' || !url.startsWith('https://')) return { error: 'Invalid URL' };
    await shell.openExternal(url);
    return { ok: true };
  });
}