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
  const ceiling = dirname(resolve(cwd));
  return new Promise((resolve) => {
    execFile(
      'git',
      args,
      {
        cwd,
        maxBuffer: 10 * 1024 * 1024,
        env: { ...process.env, GIT_CEILING_DIRECTORIES: ceiling },
      },
      (err: any, stdout: string, stderr: string) => {
        if (err) resolve({ stdout: '', stderr, error: err });
        else resolve({ stdout, stderr });
      },
    );
  });
}

/** Branch 'default' duy nhất của repo: origin/HEAD, fallback init.defaultBranch (phải tồn tại local). */
async function resolveDefaultBranch(cwd: string): Promise<{ name: string; remoteRef: string }> {
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
  const remote = await runGit(
    ['show-ref', '--verify', '--quiet', `refs/remotes/origin/${name}`],
    cwd,
  );
  return { name, remoteRef: remote.error ? '' : `origin/${name}` };
}

interface CopyPlan {
  dirs: string[];
  files: { from: string; to: string; size: number; root: string }[];
  links: { from: string; to: string }[];
  bytes: number;
  onTick?: () => void;
}

async function planCopy(from: string, to: string, plan: CopyPlan, root: string): Promise<void> {
  const st = await fs.lstat(from).catch(() => null);
  if (!st) return;
  if (st.isDirectory()) {
    plan.dirs.push(to);
    const names = await fs.readdir(from).catch(() => [] as string[]);
    await Promise.all(names.map((n) => planCopy(join(from, n), join(to, n), plan, root)));
  } else if (st.isSymbolicLink()) {
    plan.links.push({ from, to });
  } else if (st.isFile()) {
    plan.files.push({ from, to, size: st.size, root });
    plan.bytes += st.size;
    plan.onTick?.();
  }
}

/** Copy the planned files with CoW clone when supported (COPYFILE_FICLONE), reporting real bytes copied. */
async function runCopyPlan(
  plan: CopyPlan,
  onProgress: (p: {
    current: number;
    total: number;
    bytesDone: number;
    bytesTotal: number;
    label: string;
  }) => void,
): Promise<void> {
  for (const dir of plan.dirs) await fs.mkdir(dir, { recursive: true });
  let bytesDone = 0;
  let filesDone = 0;
  let next = 0;
  let failure: unknown = null;
  let lastReport = 0;
  const emit = (label: string, force = false) => {
    const now = Date.now();
    if (!force && now - lastReport < 100) return;
    lastReport = now;
    onProgress({
      current: filesDone,
      total: plan.files.length,
      bytesDone,
      bytesTotal: plan.bytes,
      label,
    });
  };
  const worker = async () => {
    while (!failure && next < plan.files.length) {
      const f = plan.files[next++];
      try {
        await fs.copyFile(f.from, f.to, fs.constants.COPYFILE_FICLONE);
      } catch (e) {
        failure = e;
        return;
      }
      bytesDone += f.size;
      filesDone++;
      emit(f.root);
    }
  };
  await Promise.all(Array.from({ length: 16 }, worker));
  if (failure) throw failure;
  for (const l of plan.links) await fs.symlink(await fs.readlink(l.from), l.to);
  emit('', true);
}

const SCAN_MAX_DEPTH = 4;
const SCAN_SKIP_DIRS = new Set(['node_modules', 'dist', 'out', 'build', 'venv', '__pycache__']);

/** Quét đệ quy (tối đa 4 cấp) các thư mục chứa .git và thu thập trạng thái từng repo. */
async function scanGitRepos(root: string) {
  const found: string[] = [];
  const walk = async (dir: string, depth: number): Promise<void> => {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    if (entries.some((e) => e.name === '.git')) found.push(dir);
    if (depth >= SCAN_MAX_DEPTH) return;
    for (const e of entries) {
      if (!e.isDirectory() || e.name.startsWith('.') || SCAN_SKIP_DIRS.has(e.name)) continue;
      await walk(join(dir, e.name), depth + 1);
    }
  };
  await walk(root, 0);

  const sumNumstat = (out: string) => {
    let added = 0;
    let deleted = 0;
    for (const line of out.split('\n')) {
      const p = line.split('\t');
      if (p.length >= 3) {
        added += parseInt(p[0], 10) || 0;
        deleted += parseInt(p[1], 10) || 0;
      }
    }
    return { added, deleted };
  };

  return Promise.all(
    found.map(async (dir) => {
      const [status, diff, cached, unpushed, branch] = await Promise.all([
        runGit(['status', '--porcelain', '--untracked-files=all'], dir),
        runGit(['diff', '--numstat'], dir),
        runGit(['diff', '--cached', '--numstat'], dir),
        runGit(['log', '@{u}..HEAD', '--oneline'], dir),
        runGit(['rev-parse', '--abbrev-ref', 'HEAD'], dir),
      ]);
      let staged = 0;
      let unstaged = 0;
      let untracked = 0;
      for (const line of status.stdout.split('\n')) {
        if (line.length < 3) continue;
        if (line.startsWith('??')) {
          untracked++;
          continue;
        }
        if (line[0] !== ' ') staged++;
        if (line[1] !== ' ') unstaged++;
      }
      const a = sumNumstat(diff.stdout);
      const b = sumNumstat(cached.stdout);
      return {
        relPath: dir === root ? '.' : dir.slice(root.length + 1).replace(/\\/g, '/'),
        absPath: dir,
        branch: branch.error ? '' : branch.stdout.trim(),
        staged,
        unstaged,
        untracked,
        added: a.added + b.added,
        deleted: a.deleted + b.deleted,
        unpushed: unpushed.error ? 0 : unpushed.stdout.split('\n').filter((l) => l.trim()).length,
      };
    }),
  );
}

export function setupGitHandlers(): void {
  // ── Scan git repos trong workspace ──
  ipcMain.handle('scanGitRepos', async (_event, payload?: { rootPath?: string }) => {
    const root = payload?.rootPath || process.cwd();
    try {
      const repos = await scanGitRepos(root);
      logger.info(`[scanGitRepos] root=${root} found=${repos.length}`);
      return { repos };
    } catch (e: any) {
      logger.error('[scanGitRepos] Error:', e);
      return { repos: [], error: e.message || String(e) };
    }
  });

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

  // ── Local diff (branch vs origin/branch) ──
  ipcMain.handle('git:local-diff', async (_event, projectPath: string, branch: string) => {
    try {
      const cwd = projectPath || process.cwd();
      const headRes = await runGit(['rev-parse', '--abbrev-ref', 'HEAD'], cwd);
      const isCurrent = headRes.stdout.trim() === branch;
      const result = await runGit(
        ['diff', '--no-color', '-M', `origin/${branch}`, ...(isCurrent ? [] : [branch])],
        cwd,
      );
      if (result.error) return { error: result.stderr || result.error.message };
      return { diff: result.stdout };
    } catch (e: any) {
      logger.error('[git:local-diff] Error:', e);
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
        const exists = await runGit(
          ['show-ref', '--verify', '--quiet', `refs/heads/${localName}`],
          cwd,
        );
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
      const result = await runGit(
        ['rev-parse', '--verify', `${ref}^{commit}`],
        projectPath || process.cwd(),
      );
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
        : countRes.stdout
            .trim()
            .split(/\s+/)
            .map((n) => parseInt(n, 10) || 0);
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

  // ── Local changes vs remote (virtual rows in graph) ──
  ipcMain.handle('git:local-changes', async (_event, projectPath: string) => {
    try {
      const cwd = projectPath || process.cwd();
      const [refsRes, headRes] = await Promise.all([
        runGit(
          ['for-each-ref', '--format=%(refname:short)', 'refs/heads', 'refs/remotes/origin'],
          cwd,
        ),
        runGit(['rev-parse', '--abbrev-ref', 'HEAD'], cwd),
      ]);
      if (refsRes.error) return { error: refsRes.stderr || refsRes.error.message };

      const refs = new Set(
        refsRes.stdout
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean),
      );
      const current = headRes.stdout.trim();
      const locals = [...refs].filter(
        (r) => r !== 'origin' && !r.startsWith('origin/') && refs.has(`origin/${r}`),
      );

      const parseNumstat = (out: string) =>
        out
          .split('\n')
          .filter((l) => l.trim().length > 0)
          .map((line) => {
            const p = line.split('\t');
            return {
              added: parseInt(p[0], 10) || 0,
              deleted: parseInt(p[1], 10) || 0,
              path: p.slice(2).join('\t'),
            };
          });

      const branches = await Promise.all(
        locals.map(async (name) => {
          type FileKind = 'added' | 'modified' | 'deleted';
          const range = [`origin/${name}`, ...(name === current ? [] : [name])];
          const [diff, nameStatus] = await Promise.all([
            runGit(['diff', '--numstat', '--no-renames', ...range], cwd),
            runGit(['diff', '--name-status', '--no-renames', ...range], cwd),
          ]);
          const kindByPath = new Map<string, FileKind>();
          if (!nameStatus.error) {
            nameStatus.stdout
              .split('\n')
              .filter((l) => l.trim().length > 0)
              .forEach((l) => {
                const p = l.split('\t');
                const code = p[0].charAt(0);
                kindByPath.set(
                  p.slice(1).join('\t'),
                  code === 'A' ? 'added' : code === 'D' ? 'deleted' : 'modified',
                );
              });
          }
          const files: { added: number; deleted: number; path: string; status?: FileKind }[] =
            diff.error
              ? []
              : parseNumstat(diff.stdout).map((f) => ({
                  ...f,
                  status: kindByPath.get(f.path) ?? 'modified',
                }));
          if (name === current) {
            const status = await runGit(['status', '--porcelain', '--untracked-files=all'], cwd);
            status.stdout
              .split('\n')
              .filter((l) => l.length > 3)
              .forEach((l) => {
                const untracked = l[0] === '?';
                const staged = !untracked && l[0] !== ' ';
                const unstaged = untracked || l[1] !== ' ';
                const code = l.slice(0, 2);
                let path = l.slice(3).trim();
                if (path.includes(' -> ')) path = path.split(' -> ')[1];
                if (!path) return;
                let file = files.find((f) => f.path === path);
                if (!file) {
                  const kind: FileKind =
                    untracked || code.includes('A')
                      ? 'added'
                      : code.includes('D')
                        ? 'deleted'
                        : 'modified';
                  file = { added: 0, deleted: 0, path, status: kind };
                  files.push(file);
                }
                Object.assign(file, { staged, unstaged, untracked });
              });
          }
          return { name, files };
        }),
      );

      return { branches: branches.filter((b) => b.files.length > 0) };
    } catch (e: any) {
      logger.error('[git:local-changes] Error:', e);
      return { error: e.message || String(e) };
    }
  });

  // ── Diagnostics: so sánh branch với default branch, log ra stdout của main (terminal VSCode đang chạy app) ──
  ipcMain.handle(
    'git:diff-diagnostics',
    async (_event, projectPath: string, branchName: string) => {
      const tag = '[DEBUG][diff-diagnostics]';
      try {
        const cwd = projectPath || process.cwd();
        const nonEmpty = (out: string) => out.split('\n').filter((l) => l.trim().length > 0);
        const [baseRes, headRes] = await Promise.all([
          runGit(['symbolic-ref', '--short', 'refs/remotes/origin/HEAD'], cwd),
          runGit(['rev-parse', '--abbrev-ref', 'HEAD'], cwd),
        ]);
        const base =
          !baseRes.error && baseRes.stdout.trim() ? baseRes.stdout.trim() : 'origin/main';
        const isCurrent = headRes.stdout.trim() === branchName;
        const ref = isCurrent ? 'HEAD' : branchName;
        const diffArgs = (...flags: string[]) => [
          'diff',
          ...flags,
          base,
          ...(isCurrent ? [] : [branchName]),
        ];

        const [
          nameStatusRes,
          numstatRes,
          numstatWRes,
          numstatCrRes,
          summaryRes,
          statusRes,
          countRes,
          commitsRes,
        ] = await Promise.all([
          runGit(diffArgs('--name-status'), cwd),
          runGit(diffArgs('--numstat'), cwd),
          runGit(diffArgs('--numstat', '-w'), cwd),
          runGit(diffArgs('--numstat', '--ignore-cr-at-eol'), cwd),
          runGit(diffArgs('--summary'), cwd),
          isCurrent
            ? runGit(['status', '--porcelain', '--untracked-files=all'], cwd)
            : Promise.resolve({ stdout: '' }),
          runGit(['rev-list', '--left-right', '--count', `${base}...${ref}`], cwd),
          runGit(
            ['log', `${base}..${ref}`, '--pretty=format:%h %s', '--shortstat', '-n', '60'],
            cwd,
          ),
        ]);
        if (nameStatusRes.error || numstatRes.error) {
          const msg = nameStatusRes.stderr || numstatRes.stderr || 'git diff failed';
          return { error: msg };
        }

        const numstatMap = (out: string) => {
          const m = new Map<string, { added: number; deleted: number; binary: boolean }>();
          nonEmpty(out).forEach((line) => {
            const p = line.split('\t');
            m.set(p.slice(2).join('\t'), {
              added: parseInt(p[0], 10) || 0,
              deleted: parseInt(p[1], 10) || 0,
              binary: p[0] === '-',
            });
          });
          return m;
        };
        const raw = numstatMap(numstatRes.stdout);
        const ignoreWs = numstatMap(numstatWRes.stdout);
        const ignoreCr = numstatMap(numstatCrRes.stdout);

        const typeCount: Record<string, number> = {};
        const diffPaths = new Set<string>();
        nonEmpty(nameStatusRes.stdout).forEach((line) => {
          const p = line.split('\t');
          const code = p[0].charAt(0);
          typeCount[code] = (typeCount[code] ?? 0) + 1;
          diffPaths.add(p[p.length - 1]);
        });

        const buckets = { binary: 0, zero: 0, small: 0, medium: 0, large: 0 };
        let totalAdded = 0;
        let totalDeleted = 0;
        let whitespaceOnly = 0;
        let crOnly = 0;
        const smallFiles: string[] = [];
        raw.forEach((v, path) => {
          totalAdded += v.added;
          totalDeleted += v.deleted;
          const n = v.added + v.deleted;
          if (v.binary) {
            buckets.binary++;
            return;
          }
          if (n === 0) {
            buckets.zero++;
            return;
          }
          if (n <= 4) {
            buckets.small++;
            smallFiles.push(`${v.added}/${v.deleted} ${path}`);
          } else if (n <= 20) buckets.medium++;
          else buckets.large++;
          const w = ignoreWs.get(path);
          if (!w || w.added + w.deleted === 0) whitespaceOnly++;
          const c = ignoreCr.get(path);
          if (!c || c.added + c.deleted === 0) crOnly++;
        });

        const dirCount = new Map<string, number>();
        diffPaths.forEach((p) => {
          const key = p.split('/').slice(0, 3).join('/');
          dirCount.set(key, (dirCount.get(key) ?? 0) + 1);
        });

        const statusPaths = new Set<string>();
        let statusDeleted = 0;
        statusRes.stdout
          .split('\n')
          .filter((l) => l.length > 3)
          .forEach((l) => {
            if (l.slice(0, 2).includes('D')) statusDeleted++;
            let p = l.slice(3).trim();
            if (p.includes(' -> ')) p = p.split(' -> ')[1];
            statusPaths.add(p.replace(/^"|"$/g, ''));
          });

        return { ok: true, base, total: diffPaths.size, statusCount: statusPaths.size };
      } catch (e: any) {
        logger.error(`${tag} Error:`, e);
        return { error: e.message || String(e) };
      }
    },
  );

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

  // ── Commit full message ──
  ipcMain.handle('git:commit-body', async (_event, projectPath: string, hash: string) => {
    try {
      const result = await runGit(
        ['show', '-s', '--format=%B', hash],
        projectPath || process.cwd(),
      );
      if (result.error) return { error: result.stderr || result.error.message };
      return { message: result.stdout.trim() };
    } catch (e: any) {
      logger.error('[git:commit-body] Error:', e);
      return { error: e.message || String(e) };
    }
  });

  // ── Commit Files ──
  ipcMain.handle('git:commit-files', async (_event, projectPath: string, hash: string) => {
    try {
      const cwd = projectPath || process.cwd();
      const [result, nameStatus] = await Promise.all([
        runGit(['show', '--numstat', '--no-renames', '--format=', hash], cwd),
        runGit(['show', '--name-status', '--no-renames', '--format=', hash], cwd),
      ]);
      if (result.error) return { error: result.stderr || result.error.message };

      const statusByPath = new Map<string, 'added' | 'modified' | 'deleted'>();
      if (!nameStatus.error) {
        nameStatus.stdout
          .split('\n')
          .filter((line) => line.trim().length > 0)
          .forEach((line) => {
            const parts = line.split('\t');
            const code = parts[0].charAt(0);
            statusByPath.set(
              parts.slice(1).join('\t'),
              code === 'A' ? 'added' : code === 'D' ? 'deleted' : 'modified',
            );
          });
      }

      const files = result.stdout
        .split('\n')
        .filter((line) => line.trim().length > 0)
        .map((line) => {
          const parts = line.split('\t');
          const path = parts.slice(2).join('\t');
          return {
            added: parseInt(parts[0], 10) || 0,
            deleted: parseInt(parts[1], 10) || 0,
            path,
            status: statusByPath.get(path) ?? 'modified',
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
          const wtPath = lines
            .find((l) => l.startsWith('worktree '))
            ?.slice(9)
            .trim();
          const ref = lines
            .find((l) => l.startsWith('branch '))
            ?.slice(7)
            .trim();
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

  // ── Remote URL ──
  ipcMain.handle('git:remote-url', async (_event, projectPath: string) => {
    try {
      const result = await runGit(['remote', 'get-url', 'origin'], projectPath || process.cwd());
      if (result.error) return { error: result.stderr || result.error.message };
      return { url: result.stdout.trim() };
    } catch (e: any) {
      logger.error('[git:remote-url] Error:', e);
      return { error: e.message || String(e) };
    }
  });

  // ── List Tags ──
  ipcMain.handle('git:list-tags', async (_event, projectPath: string) => {
    try {
      const result = await runGit(
        ['tag', '--list', '--sort=-creatordate'],
        projectPath || process.cwd(),
      );
      if (result.error) return { error: result.stderr || result.error.message };
      const tags = result.stdout
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
      return { tags };
    } catch (e: any) {
      logger.error('[git:list-tags] Error:', e);
      return { error: e.message || String(e) };
    }
  });

  // ── Prune orphan branches (local, no worktree, fully merged into default branch) ──
  ipcMain.handle('git:prune-orphan-branches', async (_event, projectPath: string) => {
    try {
      const cwd = projectPath || process.cwd();
      await runGit(['worktree', 'prune'], cwd);

      const { name: defaultBranch } = await resolveDefaultBranch(cwd);
      if (!defaultBranch) return { pruned: [], skipped: 'no default branch' };

      const merged = await runGit(
        ['branch', '--merged', defaultBranch, '--format=%(refname:short)'],
        cwd,
      );
      if (merged.error) return { error: merged.stderr || merged.error.message };

      const protectedNames = new Set<string>([defaultBranch]);
      const current = await runGit(['branch', '--show-current'], cwd);
      if (current.stdout.trim()) protectedNames.add(current.stdout.trim());
      const wtList = await runGit(['worktree', 'list', '--porcelain'], cwd);
      for (const line of wtList.stdout.split('\n')) {
        if (line.startsWith('branch '))
          protectedNames.add(
            line
              .slice(7)
              .trim()
              .replace(/^refs\/heads\//, ''),
          );
      }

      const pruned: string[] = [];
      for (const name of merged.stdout
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)) {
        if (protectedNames.has(name)) continue;
        const del = await runGit(['branch', '-d', name], cwd);
        if (!del.error) pruned.push(name);
      }
      return { pruned };
    } catch (e: any) {
      logger.error('[git:prune-orphan-branches] Error:', e);
      return { error: e.message || String(e) };
    }
  });

  ipcMain.handle('git:ignored-paths', async (_event, projectPath?: string) => {
    const cwd = projectPath || process.cwd();
    const res = await runGit(
      ['ls-files', '--others', '--ignored', '--exclude-standard', '--directory', '-z'],
      cwd,
    );
    if (res.error) return [] as string[];
    const base = cwd.replace(/\/+$/, '');
    return res.stdout
      .split('\0')
      .filter((p) => p.length > 0)
      .map((p) => `${base}/${p.replace(/\/$/, '')}`);
  });

  // ── Status ──
  ipcMain.handle('git:status', async (_event, projectPath?: string) => {
    try {
      const cwd = projectPath || process.cwd();

      const [
        statusResult,
        diffResult,
        diffCachedResult,
        unpushedResult,
        branchResult,
        committedFilesResult,
      ] = await Promise.all([
        runGit(['status', '--porcelain', '--untracked-files=all'], cwd),
        runGit(['diff', '--numstat'], cwd),
        runGit(['diff', '--cached', '--numstat'], cwd),
        runGit(['log', 'origin/HEAD..HEAD', '--oneline'], cwd),
        runGit(['rev-parse', '--abbrev-ref', 'HEAD'], cwd),
        runGit(['diff', '--name-only', 'origin/HEAD..HEAD'], cwd),
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
      const committedFiles = committedFilesResult.error
        ? []
        : committedFilesResult.stdout.split('\n').filter((l: string) => l.trim().length > 0);

      return { output: statusResult.stdout, diffStats, unpushedCommits, committedFiles, branch };
    } catch (e: any) {
      logger.error('[git:status] Error:', e);
      return { error: e.message || String(e) };
    }
  });

  // ── So sánh hash blob của các file được chỉ định với remote default branch ──
  // Chỉ hash đúng các file cần kiểm tra (không diff toàn repo): chi phí theo số file, không theo kích thước repo.
  ipcMain.handle(
    'git:diff-vs-remote',
    async (_event, projectPath?: string, absPaths: string[] = []) => {
      try {
        const cwd = projectPath || process.cwd();
        const { remoteRef } = await resolveDefaultBranch(cwd);
        if (!remoteRef) return { error: 'no remote default branch' };

        const head = await runGit(['rev-parse', remoteRef], cwd);
        if (head.error) return { error: head.stderr || head.error.message };
        const remoteHash = head.stdout.trim();
        console.log('[DEBUG] git:diff-vs-remote', { cwd, remoteRef, remoteHash, inputCount: absPaths.length });

        const base = cwd.replace(/\/+$/, '');
        const rels: string[] = [];
        const goneRels: string[] = [];
        for (const abs of absPaths) {
          if (!abs.startsWith(`${base}/`)) continue;
          const st = await fs.stat(abs).catch(() => null);
          if (st?.isFile()) rels.push(abs.slice(base.length + 1));
          else if (!st) goneRels.push(abs.slice(base.length + 1));
        }

        const differing: string[] = [];
        const CHUNK = 200;
        for (let i = 0; i < rels.length; i += CHUNK) {
          const chunk = rels.slice(i, i + CHUNK);
          const [local, remote] = await Promise.all([
            runGit(['hash-object', '--', ...chunk], cwd),
            runGit(['ls-tree', '-z', remoteRef, '--', ...chunk], cwd),
          ]);
          if (local.error) {
            differing.push(...chunk);
            continue;
          }
          const localHashes = local.stdout.split('\n').filter((l) => l.length > 0);
          const remoteBlobs = new Map<string, string>();
          for (const entry of remote.stdout.split('\0')) {
            const m = entry.match(/^\d+ blob ([0-9a-f]+)\t(.+)$/);
            if (m) remoteBlobs.set(m[2], m[1]);
          }
          chunk.forEach((rel, idx) => {
            if (remoteBlobs.get(rel) !== localHashes[idx]) differing.push(rel);
          });
        }

        for (let i = 0; i < goneRels.length; i += CHUNK) {
          const chunk = goneRels.slice(i, i + CHUNK);
          const remote = await runGit(['ls-tree', '-z', remoteRef, '--', ...chunk], cwd);
          for (const entry of remote.stdout.split('\0')) {
            const m = entry.match(/^\d+ blob [0-9a-f]+\t(.+)$/);
            if (m) differing.push(m[1]);
          }
        }

        const names = await runGit(['diff', '--name-only', '-z', 'HEAD', remoteRef], cwd);
        const remoteOnly = names.error
          ? []
          : names.stdout
              .split('\0')
              .filter((p) => p.length > 0)
              .map((p) => `${base}/${p}`);
        console.log('[DEBUG] git:diff-vs-remote differing', { count: differing.length, remoteOnlyCount: remoteOnly.length, sample: remoteOnly.slice(0, 5) });
        return { remoteHash, files: differing.map((p) => `${base}/${p}`), remoteOnly };
      } catch (e: any) {
        logger.error('[git:diff-vs-remote] Error:', e);
        return { error: e.message || String(e) };
      }
    },
  );

  // ── Diff của 1 file với remote default branch (origin/main|master) ──
  ipcMain.handle(
    'git:file-diff-vs-remote',
    async (_event, projectPath: string, filePath: string) => {
      try {
        const cwd = projectPath || process.cwd();
        const { remoteRef } = await resolveDefaultBranch(cwd);
        if (!remoteRef) return { error: 'no remote default branch' };

        const base = cwd.replace(/\/+$/, '');
        const rel = filePath.startsWith(`${base}/`) ? filePath.slice(base.length + 1) : filePath;

        const res = await runGit(['diff', '--no-color', remoteRef, '--', rel], cwd);
        if (res.error) return { error: res.stderr || res.error.message };
        if (res.stdout.trim()) return { diff: res.stdout, remoteRef };

        const tracked = await runGit(['ls-files', '--error-unmatch', '--', rel], cwd);
        if (!tracked.error) return { diff: '', remoteRef };

        const { readFile } = await import('fs/promises');
        const text = await readFile(filePath, 'utf8');
        const lines = text.split('\n');
        if (lines[lines.length - 1] === '') lines.pop();
        const diff = [
          `diff --git a/${rel} b/${rel}`,
          'new file mode 100644',
          `@@ -0,0 +1,${lines.length} @@`,
          ...lines.map((l) => `+${l}`),
        ].join('\n');
        return { diff, remoteRef };
      } catch (e: any) {
        logger.error('[git:file-diff-vs-remote] Error:', e);
        return { error: e.message || String(e) };
      }
    },
  );

  // ── Diff của 1 file giữa remote default branch và 1 branch local khác ──
  ipcMain.handle(
    'git:file-diff-vs-branch',
    async (_event, projectPath: string, filePath: string, branch: string) => {
      try {
        const cwd = projectPath || process.cwd();
        if (!branch || branch.startsWith('-')) return { error: 'invalid branch' };
        const { remoteRef } = await resolveDefaultBranch(cwd);
        if (!remoteRef) return { error: 'no remote default branch' };

        const base = cwd.replace(/\/+$/, '');
        const rel = filePath.startsWith(`${base}/`) ? filePath.slice(base.length + 1) : filePath;

        const wt = await runGit(['worktree', 'list', '--porcelain'], cwd);
        let wtPath = '';
        let curPath = '';
        if (!wt.error) {
          for (const line of wt.stdout.split('\n')) {
            if (line.startsWith('worktree ')) curPath = line.slice(9).trim();
            else if (line === `branch refs/heads/${branch}`) wtPath = curPath;
          }
        }

        const res = wtPath
          ? await runGit(['diff', '--no-color', remoteRef, '--', rel], wtPath)
          : await runGit(['diff', '--no-color', remoteRef, branch, '--', rel], cwd);
        if (res.error) return { error: res.stderr || res.error.message };
        if (res.stdout.trim() || !wtPath) return { diff: res.stdout, remoteRef, branch };

        const tracked = await runGit(['ls-files', '--error-unmatch', '--', rel], wtPath);
        if (!tracked.error) return { diff: '', remoteRef, branch };

        const { readFile } = await import('fs/promises');
        const text = await readFile(`${wtPath}/${rel}`, 'utf8');
        const lines = text.split('\n');
        if (lines[lines.length - 1] === '') lines.pop();
        const diff = [
          `diff --git a/${rel} b/${rel}`,
          'new file mode 100644',
          `@@ -0,0 +1,${lines.length} @@`,
          ...lines.map((l) => `+${l}`),
        ].join('\n');
        return { diff, remoteRef, branch };
      } catch (e: any) {
        logger.error('[git:file-diff-vs-branch] Error:', e);
        return { error: e.message || String(e) };
      }
    },
  );

  // ── File diff (tool git_diff) ──
  ipcMain.handle('git:file-diff', async (_event, projectPath: string, filePath: string) => {
    try {
      const root = projectPath || process.cwd();
      if (!filePath) return { error: 'file_path is required' };
      const isAbs = filePath.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(filePath);
      const absFile = isAbs ? filePath : join(root, filePath);
      let cwd = root;
      let dir = dirname(absFile);
      while (dir.startsWith(root)) {
        const hasGit = await fs.access(join(dir, '.git')).then(
          () => true,
          () => false,
        );
        if (hasGit) {
          cwd = dir;
          break;
        }
        const parent = dirname(dir);
        if (parent === dir) break;
        dir = parent;
      }
      const gitPath = absFile.startsWith(cwd) ? absFile.slice(cwd.length + 1) : absFile;

      const tracked = await runGit(['ls-files', '--', gitPath], cwd);
      if (!tracked.stdout.trim()) {
        try {
          const content = await fs.readFile(absFile, 'utf-8');
          const lines = content.split('\n');
          const body = lines.map((l) => '+' + l).join('\n');
          return {
            output: `--- /dev/null\n+++ b/${filePath}\n@@ -0,0 +1,${lines.length} @@\n${body}`,
          };
        } catch {
          return { output: '' };
        }
      }

      const [cached, unstaged] = await Promise.all([
        runGit(['diff', '--cached', '--', gitPath], cwd),
        runGit(['diff', '--', gitPath], cwd),
      ]);
      if (cached.error && unstaged.error) {
        return { error: cached.stderr || cached.error.message };
      }
      return { output: cached.stdout.trim() ? cached.stdout : unstaged.stdout };
    } catch (e: any) {
      logger.error('[git:file-diff] Error:', e);
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

  // ── Commit + Push các file chỉ định (chỉ commit đúng các path này) ──
  ipcMain.handle(
    'git:commit-push-files',
    async (_event, projectPath: string, absPaths: string[], message: string) => {
      try {
        const cwd = projectPath || process.cwd();
        const base = cwd.replace(/\/+$/, '');
        const allRels = (absPaths || [])
          .filter((p) => p.startsWith(`${base}/`))
          .map((p) => p.slice(base.length + 1));
        if (allRels.length === 0) return { error: 'No files to commit' };
        if (!message || !message.trim()) return { error: 'Empty commit message' };

        const ignoredOut = await runGit(['check-ignore', '--no-index', '--', ...allRels], cwd);
        const trackedOut = await runGit(['ls-files', '-z', '--', ...allRels], cwd);
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

        const add = await runGit(['add', '-f', '--', ...rels], cwd);
        if (add.error) {
          const bad: string[] = [];
          for (const r of rels) {
            const one = await runGit(['add', '--dry-run', '--', r], cwd);
            if (one.error) bad.push(`${r} => ${(one.stderr || '').split('\n')[0]}`);
          }
          return { error: add.stderr || add.error.message };
        }

        const commit = await runGit(['commit', '-m', message, '--', ...rels], cwd);
        if (commit.error) return { error: commit.stderr || commit.error.message };

        let push = await runGit(['push'], cwd);
        if (push.error) {
          push = await runGit(['push', '-u', 'origin', 'HEAD'], cwd);
        }
        if (push.error) return { committed: true, error: push.stderr || push.error.message };

        return { ok: true, committed: true };
      } catch (e: any) {
        logger.error('[git:commit-push-files] Error:', e);
        return { error: e.message || String(e) };
      }
    },
  );

  // ── Các file đã thay đổi ở branch local khác so với default branch (đối chiếu 3 chấm: A...B) ──
  ipcMain.handle('git:changed-in-other-branches', async (_event, projectPath?: string) => {
    try {
      const cwd = projectPath || process.cwd();
      const { name, remoteRef } = await resolveDefaultBranch(cwd);
      const baseRef = remoteRef || name;
      if (!baseRef) return { error: 'no default branch' };

      const cur = await runGit(['rev-parse', '--abbrev-ref', 'HEAD'], cwd);
      const current = cur.error ? '' : cur.stdout.trim();
      const refs = await runGit(['for-each-ref', '--format=%(refname:short)', 'refs/heads'], cwd);
      if (refs.error) return { error: refs.stderr || refs.error.message };
      const branches = refs.stdout
        .split('\n')
        .map((s) => s.trim())
        .filter((b) => b && b !== current);

      const base = cwd.replace(/\/+$/, '');
      const files: Record<string, string[]> = {};
      const diffs = await Promise.all(
        branches.map(async (b) => ({
          b,
          d: await runGit(['diff', '--name-only', '-z', `${baseRef}...${b}`], cwd),
        })),
      );
      for (const { b, d } of diffs) {
        if (d.error) continue;
        for (const rel of d.stdout.split('\0').filter(Boolean)) {
          const abs = `${base}/${rel}`;
          if (!files[abs]) files[abs] = [];
          files[abs].push(b);
        }
      }
      const wt = await runGit(['worktree', 'list', '--porcelain'], cwd);
      const wtByBranch = new Map<string, string>();
      if (!wt.error) {
        let wtPath = '';
        for (const line of wt.stdout.split('\n')) {
          if (line.startsWith('worktree ')) wtPath = line.slice(9).trim();
          else if (line.startsWith('branch refs/heads/'))
            wtByBranch.set(line.slice(18).trim(), wtPath);
        }
      }

      await Promise.all(
        branches.map(async (b) => {
          const wp = wtByBranch.get(b);
          if (!wp) return;
          const [tracked, untracked] = await Promise.all([
            runGit(['diff', '--name-only', '-z', 'HEAD'], wp),
            runGit(['ls-files', '--others', '--exclude-standard', '-z'], wp),
          ]);
          for (const r of [tracked, untracked]) {
            if (r.error) continue;
            for (const rel of r.stdout.split('\0').filter(Boolean)) {
              const abs = `${base}/${rel}`;
              if (!files[abs]) files[abs] = [];
              if (!files[abs].includes(b)) files[abs].push(b);
            }
          }
        }),
      );
      return { files };
    } catch (e: any) {
      logger.error('[git:changed-in-other-branches] Error:', e);
      return { error: e.message || String(e) };
    }
  });

  ipcMain.handle('git:default-branch', async (_event, projectPath?: string) => {
    const { name } = await resolveDefaultBranch(projectPath || process.cwd());
    return { name };
  });

  // ── Protect default branch (pre-commit / pre-push hooks) ──
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
    return out.error ? '' : resolve(cwd, out.stdout.trim());
  };

  const readHook = async (file: string): Promise<string | null> => {
    try {
      return await fs.readFile(file, 'utf8');
    } catch {
      return null;
    }
  };

  ipcMain.handle('git:protect-status', async (_event, projectPath: string) => {
    try {
      const dir = await resolveHooksDir(projectPath || process.cwd());
      if (!dir) return { error: 'Not a git repository' };
      let installed = 0;
      let conflict = false;
      for (const name of Object.keys(PROTECT_HOOKS)) {
        const content = await readHook(join(dir, name));
        if (content === null) continue;
        if (content.includes(PROTECT_MARKER)) installed++;
        else conflict = true;
      }
      return { protected: installed === Object.keys(PROTECT_HOOKS).length, conflict };
    } catch (e: any) {
      logger.error('[git:protect-status] Error:', e);
      return { error: e.message || String(e) };
    }
  });

  ipcMain.handle('git:protect-enable', async (_event, projectPath: string) => {
    try {
      const dir = await resolveHooksDir(projectPath || process.cwd());
      if (!dir) return { error: 'Not a git repository' };
      for (const name of Object.keys(PROTECT_HOOKS)) {
        const content = await readHook(join(dir, name));
        if (content !== null && !content.includes(PROTECT_MARKER)) {
          return {
            error: `A ${name} hook already exists in ${dir}. Add the default-branch check to it manually.`,
          };
        }
      }
      await fs.mkdir(dir, { recursive: true });
      for (const [name, script] of Object.entries(PROTECT_HOOKS)) {
        await fs.writeFile(join(dir, name), script, { mode: 0o755 });
        await fs.chmod(join(dir, name), 0o755);
      }
      return { ok: true };
    } catch (e: any) {
      logger.error('[git:protect-enable] Error:', e);
      return { error: e.message || String(e) };
    }
  });

  ipcMain.handle('git:protect-disable', async (_event, projectPath: string) => {
    try {
      const dir = await resolveHooksDir(projectPath || process.cwd());
      if (!dir) return { error: 'Not a git repository' };
      for (const name of Object.keys(PROTECT_HOOKS)) {
        const content = await readHook(join(dir, name));
        if (content !== null && content.includes(PROTECT_MARKER)) await fs.unlink(join(dir, name));
      }
      return { ok: true };
    } catch (e: any) {
      logger.error('[git:protect-disable] Error:', e);
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
    const top = await runGit(['rev-parse', '--show-toplevel'], cwd);
    if (top.error) return null;
    const [realTop, realCwd] = await Promise.all([
      fs.realpath(top.stdout.trim()).catch(() => resolve(top.stdout.trim())),
      fs.realpath(cwd).catch(() => resolve(cwd)),
    ]);
    if (realTop !== realCwd) return null;
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
          bytesDone?: number;
          bytesTotal?: number;
          label?: string;
        }) => _event.sender.send('git:create-branch-progress', p);
        report({ step: 'worktree' });

        const isRepo = await runGit(['rev-parse', '--is-inside-work-tree'], cwd);
        if (isRepo.error) return { error: 'Project này chưa có git repository' };

        const formatCheck = await runGit(['check-ref-format', '--branch', name], cwd);
        if (formatCheck.error) return { error: `Tên branch không hợp lệ: ${name}` };

        const existing = await runGit(
          ['show-ref', '--verify', '--quiet', `refs/heads/${name}`],
          cwd,
        );
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
              if (apply.error)
                logger.error('[git:create-branch-worktree] apply failed:', apply.stderr);
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

        if (copyPaths.length > 0) {
          report({ step: 'copy' });
          const plan: CopyPlan = { dirs: [], files: [], links: [], bytes: 0 };
          let lastTick = 0;
          plan.onTick = () => {
            const now = Date.now();
            if (now - lastTick < 100) return;
            lastTick = now;
            report({ step: 'copy', current: plan.files.length, bytesTotal: plan.bytes });
          };
          // Electron's fs treats *.asar as archives (e.g. electron/dist/resources/default_app.asar) and copy fails on them
          const prevNoAsar = process.noAsar;
          process.noAsar = true;
          try {
            for (const raw of copyPaths) {
              const rel = raw.replace(/\/+$/, '');
              if (!rel || rel.startsWith('/') || rel.split('/').includes('..')) continue;
              const src = join(cwd, rel);
              const dest = join(targetPath, rel);
              if (!(await fs.lstat(src).catch(() => null))) continue;
              if (await fs.lstat(dest).catch(() => null)) continue;
              await fs.mkdir(dirname(dest), { recursive: true });
              await planCopy(src, dest, plan, raw);
            }
            await runCopyPlan(plan, (p) => report({ step: 'copy', ...p }));
          } finally {
            process.noAsar = prevNoAsar;
          }
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
  ipcMain.handle(
    'git:delete-branch',
    async (_event, projectPath: string, branchName: string, deleteRemote?: boolean) => {
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

        const { name: defaultBranch } = await resolveDefaultBranch(cwd);
        if (name === defaultBranch) {
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

        let remoteError: string | undefined;
        if (deleteRemote) {
          const remoteRef = await runGit(
            ['show-ref', '--verify', '--quiet', `refs/remotes/origin/${name}`],
            cwd,
          );
          if (!remoteRef.error) {
            const pushed = await runGit(['push', 'origin', '--delete', name], cwd);
            if (pushed.error) remoteError = pushed.stderr || pushed.error.message;
          }
        }
        return { branch: name, remoteError };
      } catch (e: any) {
        logger.error('[git:delete-branch] Error:', e);
        return { error: e.message || String(e) };
      }
    },
  );

  ipcMain.handle(
    'git:remote-branch-exists',
    async (_event, projectPath: string, branchName: string) => {
      const cwd = projectPath || process.cwd();
      const name = (branchName || '').trim();
      if (!name) return { exists: false };
      const ref = await runGit(
        ['show-ref', '--verify', '--quiet', `refs/remotes/origin/${name}`],
        cwd,
      );
      return { exists: !ref.error };
    },
  );

  // ── Branch Sync (pull changed files from another branch, skipping gitignored paths) ──
  const findBranchWorktree = async (cwd: string, ref: string) => {
    const wtList = await runGit(['worktree', 'list', '--porcelain'], cwd);
    for (const block of wtList.stdout.split(/\n\s*\n/)) {
      const ls = block.split('\n').map((l) => l.trim());
      if (!ls.includes(`branch refs/heads/${ref}`)) continue;
      return ls.find((l) => l.startsWith('worktree '))?.slice(9) ?? '';
    }
    return '';
  };

  const listWorktreeFiles = async (dir: string) => {
    const [all, gone] = await Promise.all([
      runGit(['ls-files', '-z', '--cached', '--others', '--exclude-standard'], dir),
      runGit(['ls-files', '-z', '--deleted'], dir),
    ]);
    const removed = new Set(gone.stdout.split('\0').filter(Boolean));
    return new Set(all.stdout.split('\0').filter((p) => p && !removed.has(p)));
  };

  const countLines = (buf: Buffer) => {
    if (buf.length === 0) return 0;
    let n = 0;
    for (const b of buf) if (b === 10) n++;
    return buf[buf.length - 1] === 10 ? n : n + 1;
  };

  const noIndexNumstat = (a: string, b: string) =>
    new Promise<{ added: number; deleted: number }>((done) => {
      execFile(
        'git',
        ['diff', '--no-index', '--numstat', '--', a, b],
        { maxBuffer: 10 * 1024 * 1024 },
        (_e: any, stdout: string) => {
          const [x, y] = (stdout || '').split('\t');
          done({ added: parseInt(x, 10) || 0, deleted: parseInt(y, 10) || 0 });
        },
      );
    });

  // Source branch is checked out in another worktree: compare real working trees (incl. uncommitted files)
  const readWorktreeDiff = async (cwd: string, srcWt: string) => {
    const [srcFiles, tgtFiles] = await Promise.all([
      listWorktreeFiles(srcWt),
      listWorktreeFiles(cwd),
    ]);
    const files: {
      path: string;
      status: 'added' | 'modified' | 'deleted';
      added: number;
      deleted: number;
    }[] = [];
    const both: string[] = [];
    for (const p of srcFiles) {
      if (tgtFiles.has(p)) {
        both.push(p);
        continue;
      }
      try {
        const buf = await fs.readFile(resolve(srcWt, p));
        files.push({ path: p, status: 'added', added: countLines(buf), deleted: 0 });
      } catch {
        /* unreadable in source — skip */
      }
    }
    for (const p of tgtFiles) {
      if (srcFiles.has(p)) continue;
      let lines = 0;
      try {
        lines = countLines(await fs.readFile(resolve(cwd, p)));
      } catch {
        /* unreadable — count stays 0 */
      }
      files.push({ path: p, status: 'deleted', added: 0, deleted: lines });
    }
    const modified: string[] = [];
    for (let i = 0; i < both.length; i += 16) {
      await Promise.all(
        both.slice(i, i + 16).map(async (p) => {
          try {
            const [a, b] = await Promise.all([
              fs.readFile(resolve(cwd, p)),
              fs.readFile(resolve(srcWt, p)),
            ]);
            if (!a.equals(b)) modified.push(p);
          } catch {
            /* unreadable — skip */
          }
        }),
      );
    }
    for (let i = 0; i < modified.length; i += 8) {
      await Promise.all(
        modified.slice(i, i + 8).map(async (p) => {
          const st = await noIndexNumstat(resolve(cwd, p), resolve(srcWt, p));
          files.push({ path: p, status: 'modified', added: st.added, deleted: st.deleted });
        }),
      );
    }
    files.sort((a, b) => a.path.localeCompare(b.path));
    // Debug log - có thể xóa sau khi fix
    return { files, srcWt };
  };

  const readBranchDiff = async (cwd: string, ref: string) => {
    if (!ref) return { error: 'Thiếu branch nguồn' };
    const verify = await runGit(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`], cwd);
    if (verify.error) return { error: `Branch nguồn "${ref}" không tồn tại` };
    const srcWorktree = await findBranchWorktree(cwd, ref);
    if (srcWorktree && resolve(srcWorktree) !== resolve(cwd)) {
      return await readWorktreeDiff(cwd, srcWorktree);
    }

    const [names, nums] = await Promise.all([
      runGit(['diff', '-R', '--no-renames', '--name-status', '-z', ref], cwd),
      runGit(['diff', '-R', '--no-renames', '--numstat', '-z', ref], cwd),
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
    const known = new Set(files.map((f) => f.path));
    const untracked = await runGit(['ls-files', '--others', '--exclude-standard', '-z'], cwd);
    const untrackedPaths = untracked.stdout.split('\0').filter(Boolean);
    const untrackedOnly: string[] = [];
    const wtList = await runGit(['worktree', 'list', '--porcelain'], cwd);
    let srcWt = '';
    for (const block of wtList.stdout.split(/\n\s*\n/)) {
      const ls = block.split('\n').map((l) => l.trim());
      if (!ls.includes(`branch refs/heads/${ref}`)) continue;
      srcWt = ls.find((l) => l.startsWith('worktree '))?.slice(9) ?? '';
      break;
    }
    for (const p of untrackedPaths) {
      if (known.has(p)) continue;
      const inRef = await runGit(['cat-file', '-e', `${ref}:${p}`], cwd);
      if (!inRef.error) continue;
      if (srcWt) {
        try {
          const [a, b] = await Promise.all([
            fs.readFile(resolve(srcWt, p)),
            fs.readFile(resolve(cwd, p)),
          ]);
          if (a.equals(b)) continue;
        } catch {
          /* not present in source worktree — treat as missing */
        }
      }
      let lines = 0;
      try {
        const buf = await fs.readFile(resolve(cwd, p), 'utf8');
        lines = buf.length ? buf.split('\n').length - (buf.endsWith('\n') ? 1 : 0) : 0;
      } catch {
        /* unreadable file — count stays 0 */
      }
      files.push({ path: p, status: 'deleted', added: 0, deleted: lines });
      untrackedOnly.push(p);
    }

    const identical = new Set<string>();
    const addedFiles = files.filter((f) => f.status === 'added');
    if (addedFiles.length > 0) {
      const tree = await runGit(['ls-tree', '-r', '-z', ref], cwd);
      const refHash = new Map<string, string>();
      if (!tree.error) {
        for (const rec of tree.stdout.split('\0').filter(Boolean)) {
          const tab = rec.indexOf('\t');
          refHash.set(rec.slice(tab + 1), rec.slice(0, tab).split(' ')[2]);
        }
      }
      for (let i = 0; i < addedFiles.length; i += 200) {
        const present: string[] = [];
        for (const f of addedFiles.slice(i, i + 200)) {
          try {
            await fs.access(resolve(cwd, f.path));
            present.push(f.path);
          } catch {
            /* not in worktree — still a real difference */
          }
        }
        if (present.length === 0) continue;
        const hashes = await runGit(['hash-object', '--', ...present], cwd);
        if (hashes.error) continue;
        const wt = hashes.stdout.split('\n').filter(Boolean);
        present.forEach((p, idx) => {
          if (refHash.get(p) === wt[idx]) identical.add(p);
        });
      }
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
    // Debug log - có thể xóa sau khi fix
    const finalFiles = files.filter((f) => !ignored.has(f.path) && !identical.has(f.path));
    return { files: finalFiles };
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

  ipcMain.handle('git:unpushed-files', async (_event, projectPath: string, branch: string) => {
    try {
      const cwd = resolve(projectPath || process.cwd());
      const b = (branch || '').trim();
      if (!b) return { error: 'Thiếu branch nguồn' };
      const files = new Set<string>();

      const remote = await runGit(
        ['rev-parse', '--verify', '--quiet', `refs/remotes/origin/${b}`],
        cwd,
      );
      if (!remote.error) {
        const res = await runGit(
          ['diff', '--name-only', '--no-renames', '-z', `origin/${b}...${b}`],
          cwd,
        );
        res.stdout
          .split('\0')
          .filter(Boolean)
          .forEach((p) => files.add(p));
      } else {
        const res = await runGit(
          ['-c', 'core.quotepath=false', 'log', b, '--not', '--remotes', '--name-only', '--pretty=format:'],
          cwd,
        );
        res.stdout
          .split('\n')
          .filter(Boolean)
          .forEach((p) => files.add(p));
      }

      const wt = await findBranchWorktree(cwd, b);
      if (wt) {
        const st = await runGit(['status', '--porcelain', '-z', '--untracked-files=all'], wt);
        const parts = st.stdout.split('\0');
        for (let i = 0; i < parts.length; i++) {
          const rec = parts[i];
          if (rec.length < 4) continue;
          files.add(rec.slice(3));
          if (rec[0] === 'R' || rec[0] === 'C') i++;
        }
      }
      return { files: Array.from(files) };
    } catch (e: any) {
      logger.error('[git:unpushed-files] Error:', e);
      return { error: e.message || String(e) };
    }
  });

  const noIndexDiff = (a: string, b: string) =>
    new Promise<string>((done) => {
      execFile(
        'git',
        ['diff', '--no-index', '--no-color', '--', a, b],
        { maxBuffer: 20 * 1024 * 1024 },
        (_e: any, stdout: string) => done(stdout || ''),
      );
    });

  ipcMain.handle(
    'git:branch-sync-file-diff',
    async (_event, projectPath: string, sourceRef: string, filePath: string) => {
      try {
        const cwd = resolve(projectPath || process.cwd());
        const ref = (sourceRef || '').trim();
        if (!ref || !filePath) return { error: 'Thiếu branch nguồn hoặc file' };
        const mine = resolve(cwd, filePath);
        const has = (p: string) =>
          fs.access(p).then(
            () => true,
            () => false,
          );
        const srcWt = await findBranchWorktree(cwd, ref);
        let raw = '';
        if (srcWt && resolve(srcWt) !== cwd) {
          const theirs = resolve(srcWt, filePath);
          const [hasMine, hasTheirs] = await Promise.all([has(mine), has(theirs)]);
          raw = await noIndexDiff(hasMine ? mine : '/dev/null', hasTheirs ? theirs : '/dev/null');
        } else {
          const res = await runGit(
            ['diff', '--no-color', '--no-renames', '-R', ref, '--', `:(literal)${filePath}`],
            cwd,
          );
          if (res.error) return { error: res.stderr || res.error.message };
          raw = res.stdout;
          if (!raw) {
            const inRef = await runGit(['cat-file', '-e', `${ref}:${filePath}`], cwd);
            if (inRef.error && (await has(mine))) raw = await noIndexDiff(mine, '/dev/null');
          }
        }
        return { diff: raw.replace(/^diff --git .*$/m, `diff --git a/${filePath} b/${filePath}`) };
      } catch (e: any) {
        logger.error('[git:branch-sync-file-diff] Error:', e);
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
        const fromWt = 'srcWt' in diff ? diff.srcWt : '';
        if (fromWt) {
          for (const f of targets) {
            if (f.status === 'deleted') {
              await fs.rm(resolve(cwd, f.path), { force: true });
              continue;
            }
            await fs.mkdir(dirname(resolve(cwd, f.path)), { recursive: true });
            await fs.copyFile(resolve(fromWt, f.path), resolve(cwd, f.path));
          }

          return { applied: targets.length };
        }
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
