import path from 'path';
import type { GitCommandPort } from '../../ports/git-command.port';
import type { GitHubCommandPort } from '../../ports/github-command.port';
import type { ProcessResult, ProcessRunnerPort, ProcessStream } from '../../ports/process-runner.port';

type CmdResult = ProcessResult;
type Failure = { error: string; code?: string };
type JsonResult = { ok: true; data: any } | { ok: false; failure: Failure };

export interface CreatePrInput {
  title?: string;
  body?: string;
  base?: string;
  head?: string;
  draft?: boolean;
  push?: boolean;
}

const PR_LIST_FIELDS =
  'number,title,state,isDraft,author,headRefName,baseRefName,createdAt,updatedAt,url,reviewDecision,labels';
const PR_VIEW_FIELDS = `${PR_LIST_FIELDS},body,mergedAt,closedAt,mergeable,mergeStateStatus,additions,deletions,changedFiles,files,commits,reviews,comments,statusCheckRollup`;
const LIST_STATES = ['open', 'closed', 'merged', 'all'];
const MERGE_FLAGS: Record<string, string> = { merge: '--merge', squash: '--squash', rebase: '--rebase' };
const REVIEW_FLAGS: Record<string, string> = {
  approve: '--approve',
  'request-changes': '--request-changes',
  comment: '--comment',
};

const badNumber: Failure = { error: 'Invalid pull request number' };
const isPrNumber = (n: unknown): n is number => Number.isInteger(n) && (n as number) > 0;

function fail(r: CmdResult): Failure {
  if ((r.error as any)?.code === 'ENOENT') {
    return { error: 'GitHub CLI (gh) is not installed', code: 'GH_NOT_INSTALLED' };
  }
  const text = (r.stderr || r.error?.message || 'gh failed').trim();
  if (/not logged in|gh auth login|authentication/i.test(text)) {
    return { error: 'Not logged in to GitHub. Run gh auth login in a terminal.', code: 'GH_NOT_AUTHENTICATED' };
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

export class PullRequestService {
  private webLoginProc: ProcessStream | null = null;

  constructor(
    private readonly gh: GitHubCommandPort,
    private readonly git: GitCommandPort,
    private readonly processRunner: ProcessRunnerPort,
  ) {}

  private runCmd(bin: 'gh' | 'git', args: string[], cwd: string): Promise<CmdResult> {
    return bin === 'gh' ? this.gh.run(args, cwd) : this.git.run(args, cwd);
  }

  private async ghJson(cwd: string, args: string[]): Promise<JsonResult> {
    const r = await this.runCmd('gh', args, cwd);
    if (r.error) return { ok: false, failure: fail(r) };
    try {
      return { ok: true, data: JSON.parse(r.stdout) };
    } catch {
      return { ok: false, failure: { error: 'Invalid response from gh' } };
    }
  }

  private async action(cwd: string, args: string[] | Failure): Promise<{ ok: true; output: string } | Failure> {
    if (!Array.isArray(args)) return args;
    const r = await this.runCmd('gh', args, cwd);
    if (r.error) return fail(r);
    return { ok: true, output: r.stdout.trim() };
  }

  private stopWebLogin(): void {
    this.webLoginProc?.kill();
    this.webLoginProc = null;
  }

  async status(cwd: string): Promise<Record<string, unknown>> {
    const version = await this.runCmd('gh', ['--version'], cwd);
    if ((version.error as any)?.code === 'ENOENT') return { installed: false, authenticated: false };
    const auth = await this.runCmd('gh', ['auth', 'status'], cwd);
    if (auth.error) return { installed: true, authenticated: false };
    const repo = await this.ghJson(cwd, ['repo', 'view', '--json', 'nameWithOwner,url,defaultBranchRef']);
    if (!repo.ok) return { installed: true, authenticated: true, repoError: repo.failure.error };
    return {
      installed: true,
      authenticated: true,
      repo: {
        nameWithOwner: repo.data.nameWithOwner,
        url: repo.data.url,
        defaultBranch: repo.data.defaultBranchRef?.name ?? '',
      },
    };
  }

  loginToken(cwd: string, token: unknown): Promise<{ ok?: boolean; error?: string }> {
    const t = typeof token === 'string' ? token.trim() : '';
    if (!t || /\s/.test(t)) return Promise.resolve({ error: 'Invalid token' });
    return new Promise((done) => {
      const p = this.processRunner.spawnStream('gh', ['auth', 'login', '--hostname', 'github.com', '--with-token'], {
        cwd: path.resolve(cwd),
        env: { ...process.env, GH_PROMPT_DISABLED: '1', NO_COLOR: '1' },
      });
      let err = '';
      p.stderr?.on('data', (d) => (err += String(d)));
      p.on('error', (e: any) =>
        done({ error: e?.code === 'ENOENT' ? 'GitHub CLI (gh) is not installed' : e.message }),
      );
      p.on('close', (code) =>
        done(code === 0 ? { ok: true } : { error: (err.trim() || 'Login failed').split('\n')[0] }),
      );
      p.stdin?.on('error', () => {});
      p.stdin?.end(t + '\n');
    });
  }

  loginWeb(cwd: string): Promise<{ code?: string; url?: string; error?: string }> {
    this.stopWebLogin();
    return new Promise((done) => {
      const p = this.processRunner.spawnStream(
        'gh',
        ['auth', 'login', '--hostname', 'github.com', '--git-protocol', 'https', '--web'],
        {
          cwd: path.resolve(cwd),
          env: { ...process.env, NO_COLOR: '1', BROWSER: 'true' },
        },
      );
      this.webLoginProc = p;
      let out = '';
      let settled = false;
      const finish = (v: { code?: string; url?: string; error?: string }) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        done(v);
      };
      const timer = setTimeout(() => finish({ error: 'Timed out waiting for GitHub code' }), 15000);
      const onData = (data: string) => {
        out += data;
        const code = out.match(/\b[A-Z0-9]{4}-[A-Z0-9]{4}\b/)?.[0];
        if (code) finish({ code, url: 'https://github.com/login/device' });
      };
      p.onStdout(onData);
      p.onStderr(onData);
      p.onExit(() => {
        if (this.webLoginProc === p) this.webLoginProc = null;
        finish({ error: (out.trim() || 'Login failed').split('\n').pop() });
      });
    });
  }

  cancelLoginWeb(): { ok: boolean } {
    this.stopWebLogin();
    return { ok: true };
  }

  async list(cwd: string, state = 'open', limit = 50): Promise<{ prs: unknown } | Failure> {
    const s = LIST_STATES.includes(state) ? state : 'open';
    const n = Math.min(Math.max(Number(limit) || 50, 1), 200);
    const res = await this.ghJson(cwd, ['pr', 'list', '--state', s, '--limit', String(n), '--json', PR_LIST_FIELDS]);
    return res.ok ? { prs: res.data } : res.failure;
  }

  async view(cwd: string, number: number): Promise<{ pr: unknown } | Failure> {
    if (!isPrNumber(number)) return badNumber;
    const res = await this.ghJson(cwd, ['pr', 'view', String(number), '--json', PR_VIEW_FIELDS]);
    return res.ok ? { pr: res.data } : res.failure;
  }

  async diff(cwd: string, number: number): Promise<{ diff: string } | Failure> {
    if (!isPrNumber(number)) return badNumber;
    const r = await this.runCmd('gh', ['pr', 'diff', String(number)], cwd);
    return r.error ? fail(r) : { diff: r.stdout };
  }

  async create(cwd: string, opts: CreatePrInput): Promise<{ ok: true; url: string } | Failure> {
    const title = (opts?.title || '').trim();
    if (!title) return { error: 'Title is required' };
    let head = (opts.head || '').trim();
    if (!head) {
      const cur = await this.runCmd('git', ['branch', '--show-current'], cwd);
      head = cur.error ? '' : cur.stdout.trim();
    }
    if (!head) return { error: 'Cannot determine the branch to open the pull request from' };
    const base = (opts.base || '').trim();
    if (head.startsWith('-') || base.startsWith('-')) return { error: 'Invalid branch name' };
    if (base && base === head) {
      return { error: `Branch ${head} is the base branch. Create a feature branch first.` };
    }
    if (opts.push !== false) {
      const pushed = await this.runCmd('git', ['push', '-u', 'origin', head], cwd);
      if (pushed.error) return { error: (pushed.stderr || pushed.error.message).trim() };
    }
    const args = ['pr', 'create', '--title', title, '--body', opts.body ?? '', '--head', head];
    if (base) args.push('--base', base);
    if (opts.draft) args.push('--draft');
    const r = await this.runCmd('gh', args, cwd);
    if (r.error) return fail(r);
    return { ok: true, url: r.stdout.trim().split('\n').pop() ?? '' };
  }

  merge(cwd: string, n: number, method = 'merge', deleteBranch = false) {
    if (!isPrNumber(n)) return Promise.resolve(badNumber);
    const flag = MERGE_FLAGS[method];
    if (!flag) return Promise.resolve<Failure>({ error: 'Invalid merge method' });
    const args = ['pr', 'merge', String(n), flag];
    if (deleteBranch) args.push('--delete-branch');
    return this.action(cwd, args);
  }

  close(cwd: string, n: number, comment?: string) {
    if (!isPrNumber(n)) return Promise.resolve(badNumber);
    const args = ['pr', 'close', String(n)];
    if (comment && comment.trim()) args.push('--comment', comment.trim());
    return this.action(cwd, args);
  }

  reopen(cwd: string, n: number) {
    return this.action(cwd, isPrNumber(n) ? ['pr', 'reopen', String(n)] : badNumber);
  }

  ready(cwd: string, n: number) {
    return this.action(cwd, isPrNumber(n) ? ['pr', 'ready', String(n)] : badNumber);
  }

  comment(cwd: string, n: number, body?: string) {
    if (!isPrNumber(n)) return Promise.resolve(badNumber);
    if (!body || !body.trim()) return Promise.resolve<Failure>({ error: 'Comment is empty' });
    return this.action(cwd, ['pr', 'comment', String(n), '--body', body.trim()]);
  }

  review(cwd: string, n: number, reviewAction: string, body?: string) {
    if (!isPrNumber(n)) return Promise.resolve(badNumber);
    const flag = REVIEW_FLAGS[reviewAction];
    if (!flag) return Promise.resolve<Failure>({ error: 'Invalid review action' });
    const text = (body || '').trim();
    if (reviewAction !== 'approve' && !text) {
      return Promise.resolve<Failure>({ error: 'A comment is required for this review' });
    }
    const args = ['pr', 'review', String(n), flag];
    if (text) args.push('--body', text);
    return this.action(cwd, args);
  }
}