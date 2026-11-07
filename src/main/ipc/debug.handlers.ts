/**
 * ------------------------------------------------------------------
 * IPC Debug Handlers
 * ------------------------------------------------------------------
 * Cầu nối Debug Adapter Protocol (DAP) giữa Renderer và js-debug
 * (dùng cho node/chrome/msedge/extensionHost). js-debug standalone
 * được đóng gói sẵn tại `resources/js-debug` nên chạy offline. Main
 * process spawn `dapDebugServer.js` (TCP), mở socket cho từng session
 * (js-debug dùng nhiều session: root + child qua `startDebugging`),
 * đóng/mở khung `Content-Length` và chuyển tiếp message JSON nguyên
 * văn cho Renderer. Mọi logic DAP nằm ở Renderer.
 *
 * Channels:
 * - debug:read-launch    : Đọc .vscode/launch.json (JSONC) → configurations đã resolve biến
 * - debug:launch-adapter : Spawn js-debug server (dùng lại nếu đang chạy) → { port }
 * - debug:connect        : Mở socket mới tới adapter cho 1 session
 * - debug:send           : Ghi 1 message DAP vào socket của session
 * - debug:stop           : Đóng socket của session
 * - debug:stop-adapter   : Đóng mọi session và kill adapter
 * - debug:message (main → renderer) : Message DAP từ adapter
 * - debug:output  (main → renderer) : stdout/stderr của adapter
 * - debug:exit    (main → renderer) : Socket của session bị đóng
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Electron ──
import { app, ipcMain } from 'electron';

// ── Node.js ──
import { spawn, type ChildProcess } from 'child_process';
import * as net from 'net';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// ── Internal ──
import { logger } from '../utils/logger';

// ─── Constants ──────────────────────────────────────────────────────────
interface DebugConnection {
  socket: net.Socket;
  buffer: Buffer;
  sender: Electron.WebContents;
}

interface AdapterProcess {
  proc: ChildProcess;
  port: number;
}

const ADAPTER_HOST = '127.0.0.1';
const ADAPTER_START_TIMEOUT_MS = 8000;
const ADAPTER_IDLE_KILL_MS = 500;
const PLATFORM_KEY =
  process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'osx' : 'linux';

const connections = new Map<string, DebugConnection>();
const watchedSenders = new WeakSet<Electron.WebContents>();
let adapter: AdapterProcess | null = null;

const LAUNCH_TEMPLATE =
  JSON.stringify(
    {
      version: '0.2.0',
      configurations: [
        {
          name: 'Launch Program',
          type: 'node',
          request: 'launch',
          program: '${workspaceFolder}/index.js',
          cwd: '${workspaceFolder}',
        },
      ],
    },
    null,
    2,
  ) + '\n';

// ─── Adapter lifecycle ──────────────────────────────────────────────────
// Dev: <appPath>/resources/js-debug; build: <resourcesPath>/resources/js-debug (extraResources)
function findDapServer(): string | null {
  const bases = [
    path.join(process.resourcesPath, 'resources', 'js-debug'),
    path.join(app.getAppPath(), 'resources', 'js-debug'),
  ];
  for (const base of bases) {
    const file = path.join(base, 'js-debug', 'src', 'dapDebugServer.js');
    if (fs.existsSync(file)) return file;
  }
  return null;
}

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, ADAPTER_HOST, () => {
      const { port } = server.address() as net.AddressInfo;
      server.close(() => resolve(port));
    });
  });
}

function waitForPort(port: number, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve) => {
    const attempt = (): void => {
      const probe = net.connect(port, ADAPTER_HOST);
      probe.once('connect', () => {
        probe.destroy();
        resolve(true);
      });
      probe.once('error', () => {
        probe.destroy();
        if (Date.now() > deadline) resolve(false);
        else setTimeout(attempt, 100);
      });
    };
    attempt();
  });
}

function killAdapter(): void {
  const current = adapter;
  adapter = null;
  if (!current) return;
  try {
    current.proc.kill();
  } catch {
    logger.warn('[Debug] Adapter already exited');
  }
}

function closeConnection(sessionId: string): void {
  const conn = connections.get(sessionId);
  if (!conn) return;
  connections.delete(sessionId);
  conn.socket.destroy();
}

function stopAll(): void {
  for (const sessionId of [...connections.keys()]) closeConnection(sessionId);
  killAdapter();
}

const trackedChildren = new Set<ReturnType<typeof spawn>>();

function trackChild(child: ReturnType<typeof spawn>): void {
  trackedChildren.add(child);
  child.once('exit', () => trackedChildren.delete(child));
}

function killTrackedChildren(): void {
  for (const child of trackedChildren) {
    try {
      if (child.pid && process.platform !== 'win32') process.kill(-child.pid, 'SIGTERM');
      else child.kill();
    } catch {
      child.kill();
    }
  }
  trackedChildren.clear();
}

export function stopAllDebug(): void {
  stopAll();
  killTrackedChildren();
}

function stopAdapterIfIdle(): void {
  setTimeout(() => {
    if (connections.size === 0) killAdapter();
  }, ADAPTER_IDLE_KILL_MS);
}

function watchSender(sender: Electron.WebContents): void {
  if (watchedSenders.has(sender)) return;
  watchedSenders.add(sender);
  sender.on('did-start-loading', stopAll);
  sender.once('destroyed', stopAll);
}

// ─── DAP framing ────────────────────────────────────────────────────────
function drainBuffer(sessionId: string, conn: DebugConnection): void {
  while (true) {
    const headerEnd = conn.buffer.indexOf('\r\n\r\n');
    if (headerEnd < 0) return;
    const header = conn.buffer.subarray(0, headerEnd).toString('ascii');
    const match = header.match(/Content-Length:\s*(\d+)/i);
    if (!match) {
      conn.buffer = conn.buffer.subarray(headerEnd + 4);
      continue;
    }
    const length = Number(match[1]);
    const bodyStart = headerEnd + 4;
    if (conn.buffer.length < bodyStart + length) return;
    const body = conn.buffer.subarray(bodyStart, bodyStart + length).toString('utf8');
    conn.buffer = conn.buffer.subarray(bodyStart + length);
    if (conn.sender.isDestroyed()) continue;
    try {
      conn.sender.send('debug:message', { sessionId, message: JSON.parse(body) });
    } catch (err) {
      logger.error('[Debug] Invalid DAP message:', err);
    }
  }
}

// ─── Tasks (preLaunchTask) ──────────────────────────────────────────────
const DEFAULT_BACKGROUND_READY =
  /watching for file changes|found 0 errors|compiled successfully|build finished/i;

function resolveTaskSpec(
  projectPath: string,
  label: string,
): { command: string; cwd: string; env: NodeJS.ProcessEnv; ready: RegExp | null } | null {
  let tasks: any[] = [];
  const tasksFile = path.join(projectPath, '.vscode', 'tasks.json');
  try {
    if (fs.existsSync(tasksFile)) {
      const parsed = JSON.parse(stripJsonc(fs.readFileSync(tasksFile, 'utf8')));
      tasks = Array.isArray(parsed?.tasks) ? parsed.tasks : [];
    }
  } catch (err) {
    logger.warn('[Debug] Cannot parse tasks.json:', err);
  }
  const raw = tasks.find(
    (t) => t?.label === label || (t?.type === 'npm' && `npm: ${t.script}` === label),
  );
  const task = raw ? (resolveVariables(raw, projectPath) as any) : null;
  let command: string | null = null;
  if (task?.type === 'npm' && task.script) command = `npm run ${task.script}`;
  else if (task?.command) command = [task.command, ...(task.args ?? [])].map(String).join(' ');
  else if (label.startsWith('npm: ')) command = `npm run ${label.slice(5)}`;
  if (!command) return null;

  let ready: RegExp | null = null;
  if (task?.isBackground) {
    const matcher = Array.isArray(task.problemMatcher)
      ? task.problemMatcher[0]
      : task.problemMatcher;
    const pattern = matcher?.background?.endsPattern;
    try {
      ready = typeof pattern === 'string' ? new RegExp(pattern) : DEFAULT_BACKGROUND_READY;
    } catch {
      ready = DEFAULT_BACKGROUND_READY;
    }
  }
  const env: NodeJS.ProcessEnv = { ...process.env, ...(task?.options?.env ?? {}) };
  for (const key of Object.keys(env)) {
    if (key.startsWith('ELECTRON_') || key.startsWith('VSCODE_')) delete env[key];
  }
  for (const key of ['NODE_ENV', 'NODE_OPTIONS']) delete env[key];
  return { command, cwd: task?.options?.cwd ?? projectPath, env, ready };
}

function runTask(
  sender: Electron.WebContents,
  projectPath: string,
  label: string,
  logFile?: string,
): Promise<{ ok: boolean; error?: string }> {
  const spec = resolveTaskSpec(projectPath, label);
  const log = (text: string): void => {
    if (!logFile) return;
    try {
      fs.appendFileSync(logFile, text);
    } catch {
      logger.warn('[Debug] Cannot write task log');
    }
  };
  if (spec) log(`> Executing task: ${spec.command}\n\n`);
  if (!spec) {
    return Promise.resolve({
      ok: false,
      error: `Task "${label}" not found (.vscode/tasks.json / package.json)`,
    });
  }
  return new Promise((resolve) => {
    const proc = spawn(spec.command, {
      shell: true,
      cwd: spec.cwd,
      env: spec.env,
      detached: process.platform !== 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    trackChild(proc);
    let settled = false;
    const finish = (result: { ok: boolean; error?: string }): void => {
      if (settled) return;
      settled = true;
      resolve(result);
    };
    const forward = (chunk: Buffer): void => {
      const text = chunk.toString('utf8');
      log(text);
      if (!sender.isDestroyed()) sender.send('debug:output', { sessionId: 'task', text });
      if (spec.ready && spec.ready.test(text)) finish({ ok: true });
    };
    proc.stdout?.on('data', forward);
    proc.stderr?.on('data', forward);
    if (spec.ready) sender.once('destroyed', () => proc.kill());
    proc.on('error', (err) => finish({ ok: false, error: err.message }));
    proc.on('close', (code) => {
      log('\n *  Terminal will be reused by tasks, press any key to close it.\n\n');
      finish(
        code === 0
          ? { ok: true }
          : { ok: false, error: `Task "${label}" exited with code ${code}` },
      );
    });
  });
}

// ─── launch.json ────────────────────────────────────────────────────────
function stripJsonc(text: string): string {
  let out = '';
  let i = 0;
  let inString = false;
  while (i < text.length) {
    const c = text[i];
    const next = text[i + 1];
    if (inString) {
      out += c;
      if (c === '\\') {
        out += next ?? '';
        i += 2;
        continue;
      }
      if (c === '"') inString = false;
      i++;
      continue;
    }
    if (c === '"') {
      inString = true;
      out += c;
      i++;
      continue;
    }
    if (c === '/' && next === '/') {
      while (i < text.length && text[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && next === '*') {
      i += 2;
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    out += c;
    i++;
  }
  return out.replace(/,(\s*[}\]])/g, '$1');
}

function resolveVariables(value: unknown, root: string): unknown {
  if (typeof value === 'string') {
    return value.replace(/\$\{([^}]+)\}/g, (match, expr: string) => {
      if (expr === 'workspaceFolder') return root;
      if (expr === 'workspaceFolderBasename') return path.basename(root);
      if (expr === 'userHome') return os.homedir();
      if (expr === 'pathSeparator' || expr === '/') return path.sep;
      if (expr.startsWith('env:')) return process.env[expr.slice(4)] ?? '';
      return match;
    });
  }
  if (Array.isArray(value)) return value.map((item) => resolveVariables(item, root));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, resolveVariables(item, root)]),
    );
  }
  return value;
}

function readLaunchConfigurations(projectPath: string): {
  ok: boolean;
  exists: boolean;
  configurations: Record<string, unknown>[];
  version?: string;
  error?: string;
} {
  const file = path.join(projectPath, '.vscode', 'launch.json');
  if (!fs.existsSync(file)) return { ok: true, exists: false, configurations: [] };
  try {
    const parsed = JSON.parse(stripJsonc(fs.readFileSync(file, 'utf8')));
    const list: any[] = Array.isArray(parsed?.configurations) ? parsed.configurations : [];
    const configurations = list
      .filter((c) => c && typeof c === 'object' && typeof c.name === 'string')
      .map((c) => {
        const { windows: _w, linux: _l, osx: _o, ...rest } = c;
        const override = c[PLATFORM_KEY];
        const merged = { ...rest, ...(override && typeof override === 'object' ? override : {}) };
        return resolveVariables(merged, projectPath) as Record<string, unknown>;
      });
    const version = typeof parsed?.version === 'string' ? parsed.version : undefined;
    return { ok: true, exists: true, configurations, version };
  } catch (err: any) {
    return {
      ok: false,
      exists: true,
      configurations: [],
      error: `launch.json: ${err?.message ?? String(err)}`,
    };
  }
}

// ─── Handlers ───────────────────────────────────────────────────────────
export function setupDebugHandlers(): void {
  ipcMain.handle('debug:read-launch', (_event, projectPath: string) =>
    readLaunchConfigurations(projectPath),
  );

  ipcMain.handle(
    'debug:spawn',
    (
      _event,
      payload: {
        command: string;
        args: string[];
        cwd?: string;
        env?: Record<string, string | null>;
      },
    ) =>
      new Promise<{ ok: boolean; error?: string }>((resolve) => {
        const env: NodeJS.ProcessEnv = { ...process.env };
        for (const key of Object.keys(env)) {
          if (
            key.startsWith('ELECTRON_') ||
            key.startsWith('VSCODE_') ||
            key === 'NODE_OPTIONS' ||
            key === 'NODE_ENV'
          ) {
            delete env[key];
          }
        }
        for (const [key, value] of Object.entries(payload.env ?? {})) {
          if (value === null) delete env[key];
          else env[key] = value;
        }
        const child = spawn(payload.command, payload.args, {
          cwd: payload.cwd,
          env,
          detached: true,
          stdio: ['ignore', 'pipe', 'pipe'],
        });
        trackChild(child);

        child.once('error', (err) => resolve({ ok: false, error: err.message }));
        child.once('spawn', () => {
          child.unref();
          resolve({ ok: true });
        });
      }),
  );

  ipcMain.handle('debug:run-task', (event, projectPath: string, label: string, logFile?: string) =>
    runTask(event.sender, projectPath, label, logFile),
  );

  ipcMain.handle('debug:launch-adapter', async (event) => {
    watchSender(event.sender);
    if (adapter) return { ok: true, port: adapter.port };

    const script = findDapServer();
    if (!script) {
      return {
        ok: false,
        error: 'js-debug not found at resources/js-debug/js-debug/src/dapDebugServer.js',
      };
    }

    try {
      const port = await getFreePort();
      const proc = spawn(process.execPath, [script, String(port), ADAPTER_HOST], {
        env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      const current: AdapterProcess = { proc, port };
      adapter = current;

      const forward = (chunk: Buffer): void => {
        if (!event.sender.isDestroyed()) {
          event.sender.send('debug:output', { sessionId: 'adapter', text: chunk.toString('utf8') });
        }
      };
      proc.stdout?.on('data', forward);
      proc.stderr?.on('data', forward);
      proc.on('exit', () => {
        if (adapter === current) adapter = null;
      });

      if (!(await waitForPort(port, ADAPTER_START_TIMEOUT_MS))) {
        killAdapter();
        return { ok: false, error: 'js-debug did not start in time' };
      }
      return { ok: true, port };
    } catch (err: any) {
      killAdapter();
      return { ok: false, error: err?.message ?? String(err) };
    }
  });

  ipcMain.handle('debug:connect', (event, payload: { sessionId: string }) => {
    return new Promise<{ ok: boolean; error?: string }>((resolve) => {
      if (!adapter) {
        resolve({ ok: false, error: 'Debug adapter is not running' });
        return;
      }
      closeConnection(payload.sessionId);

      const socket = net.connect(adapter.port, ADAPTER_HOST);
      const conn: DebugConnection = { socket, buffer: Buffer.alloc(0), sender: event.sender };

      socket.once('connect', () => {
        connections.set(payload.sessionId, conn);
        resolve({ ok: true });
      });
      socket.on('error', (err) => resolve({ ok: false, error: err.message }));
      socket.on('data', (chunk: Buffer) => {
        conn.buffer = Buffer.concat([conn.buffer, chunk]);
        drainBuffer(payload.sessionId, conn);
      });
      socket.on('close', () => {
        if (connections.get(payload.sessionId) === conn) {
          connections.delete(payload.sessionId);
          if (!event.sender.isDestroyed()) {
            event.sender.send('debug:exit', { sessionId: payload.sessionId });
          }
        }
        stopAdapterIfIdle();
      });
    });
  });

  ipcMain.handle('debug:create-launch', (_event, projectPath: string) => {
    const file = path.join(projectPath, '.vscode', 'launch.json');
    try {
      if (!fs.existsSync(file)) {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, LAUNCH_TEMPLATE);
      }
      return { ok: true, path: file };
    } catch (err: any) {
      return { ok: false, error: err?.message ?? String(err) };
    }
  });

  ipcMain.handle('debug:send', (_event, sessionId: string, message: unknown) => {
    const conn = connections.get(sessionId);
    if (!conn || conn.socket.destroyed) return false;
    const body = Buffer.from(JSON.stringify(message), 'utf8');
    conn.socket.write(`Content-Length: ${body.length}\r\n\r\n`);
    conn.socket.write(body);
    return true;
  });

  ipcMain.handle('debug:stop', (_event, sessionId: string) => {
    closeConnection(sessionId);
    return true;
  });

  ipcMain.handle('debug:stop-adapter', () => {
    stopAll();
    return true;
  });
}
