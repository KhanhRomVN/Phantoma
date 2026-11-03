/**
 * ------------------------------------------------------------------
 * Debug Store (DAP Client)
 * ------------------------------------------------------------------
 * Zustand store: đọc danh sách configuration từ .vscode/launch.json và
 * điều khiển phiên debug bằng Debug Adapter Protocol qua IPC `debug:*`
 * (adapter là js-debug: node / chrome / msedge / Electron).
 *
 * js-debug dùng nhiều session: session root gửi reverse request
 * `startDebugging`, mỗi request mở thêm 1 session con (kết nối riêng tới
 * cùng adapter). Việc dừng/step thao tác trên session đang `stopped`.
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── External ──
import { create } from 'zustand';

// ── Hooks ──
import { useCodeStore } from '../hooks/useCodeStore';

// ─── Types ──────────────────────────────────────────────────────────────
export type DebugStatus = 'idle' | 'starting' | 'running' | 'stopped';

export interface DebugConfiguration {
  name: string;
  type: string;
  request: string;
  [key: string]: unknown;
}

interface DebugState {
  configurations: DebugConfiguration[];
  selectedName: string | null;
  launchExists: boolean;
  loadError: string | null;
  status: DebugStatus;
  error: string | null;
  breakpoints: Record<string, number[]>;
  loadConfigurations: (projectPath?: string) => Promise<void>;
  selectConfiguration: (name: string) => void;
  toggleBreakpoint: (file: string, line: number) => void;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  restart: () => Promise<void>;
  resume: () => void;
  pause: () => void;
  stepOver: () => void;
  stepIn: () => void;
  stepOut: () => void;
}

interface PendingRequest {
  resolve: (body: any) => void;
  reject: (err: Error) => void;
}

interface Session {
  id: string;
  seq: number;
  pending: Map<number, PendingRequest>;
  threadId: number | null;
  root: boolean;
}

// ─── Constants ──────────────────────────────────────────────────────────
// ASSUMED: chỉ hỗ trợ các type mà js-debug xử lý (chưa có python/go/...)
const SUPPORTED_TYPES: Record<string, string> = {
  node: 'pwa-node',
  'pwa-node': 'pwa-node',
  chrome: 'pwa-chrome',
  'pwa-chrome': 'pwa-chrome',
  msedge: 'pwa-msedge',
  'pwa-msedge': 'pwa-msedge',
  extensionHost: 'pwa-extensionHost',
  'pwa-extensionHost': 'pwa-extensionHost',
};

const DISCONNECT_TIMEOUT_MS = 1500;

const sessions = new Map<string, Session>();
let sessionCounter = 0;
let activeSessionId: string | null = null;
let unsubscribers: Array<() => void> = [];
let launchedConfig: DebugConfiguration | null = null;
let projectRoot: string | null = null;
let startToken = 0;

// ASSUMED: shell POSIX (Linux/macOS) nên dùng single-quote để truyền tham số an toàn
const quote = (s: unknown) => "'" + String(s).replace(/'/g, "'\\''") + "'";

const getApi = () => (window as any).api;

// ASSUMED: activeWorkspaceSessionId có thể thuộc project khác sau khi đổi project → chọn session đầu tiên của project hiện tại
function resolveWorkspaceSessionId(): string | null {
  const cs = useCodeStore.getState();
  const sessions = (cs.projects.find((p) => p.id === cs.currentProjectId)?.branches ?? []).flatMap(
    (b) => b.sessions,
  );
  const active = cs.activeWorkspaceSessionId;
  if (active && sessions.some((s) => s.id === active)) return active;
  const fallback = sessions[0]?.id ?? null;
  if (fallback) cs.setActiveWorkspaceSessionId(fallback);
  return fallback;
}

// ─── Store ──────────────────────────────────────────────────────────────
export const useDebugStore = create<DebugState>((set, get) => ({
  configurations: [],
  selectedName: null,
  launchExists: false,
  loadError: null,
  status: 'idle',
  error: null,
  breakpoints: {},

  loadConfigurations: async (projectPath) => {
    if (!projectPath) {
      set({ configurations: [], selectedName: null, launchExists: false, loadError: null });
      return;
    }
    projectRoot = projectPath;
    const res = await getApi().invoke('debug:read-launch', projectPath);
    const configurations: DebugConfiguration[] = res?.configurations ?? [];
    const keep = configurations.some((c) => c.name === get().selectedName);
    set({
      configurations,
      launchExists: !!res?.exists,
      loadError: res?.ok ? null : (res?.error ?? 'Cannot read launch.json'),
      selectedName: keep ? get().selectedName : (configurations[0]?.name ?? null),
    });
  },

  selectConfiguration: (name) => set({ selectedName: name }),

  toggleBreakpoint: (file, line) => {
    const current = get().breakpoints[file] ?? [];
    const next = current.includes(line) ? current.filter((l) => l !== line) : [...current, line];
    const breakpoints = { ...get().breakpoints, [file]: next };
    if (next.length === 0) delete breakpoints[file];
    set({ breakpoints });
    sessions.forEach((session) => {
      void request(session, 'setBreakpoints', {
        source: { path: file },
        breakpoints: next.map((l) => ({ line: l })),
      }).catch(() => undefined);
    });
  },

  start: async () => {
    if (get().status !== 'idle') return;
    const config = get().configurations.find((c) => c.name === get().selectedName);
    if (!config) {
      set({ error: 'Select a configuration first' });
      return;
    }
    const type = SUPPORTED_TYPES[config.type];
    if (!type) {
      set({
        error: `Debug type "${config.type}" is not supported yet (node, chrome, msedge, extensionHost only)`,
      });
      return;
    }

    set({ status: 'starting', error: null });
    const token = ++startToken;

    if (typeof config.preLaunchTask === 'string' && projectRoot) {
      const logFile = `/tmp/phantoma-task-${Date.now()}.log`;
      const terminalSession = resolveWorkspaceSessionId();
      if (terminalSession) {
        useCodeStore
          .getState()
          .requestOpenTerminal(
            terminalSession,
            config.preLaunchTask,
            `touch ${quote(logFile)} && clear && tail -n +1 -f ${quote(logFile)}`,
            projectRoot,
            'debug:task',
          );
      }
      const task = await getApi().invoke(
        'debug:run-task',
        projectRoot,
        config.preLaunchTask,
        logFile,
      );
      if (token !== startToken) return;
      if (!task?.ok) {
        set({
          status: 'idle',
          error: task?.error ?? `preLaunchTask "${config.preLaunchTask}" failed`,
        });
        return;
      }
    }

    attachListeners();

    const adapter = await getApi().invoke('debug:launch-adapter');
    if (token !== startToken) return;
    if (!adapter?.ok) {
      failSession(adapter?.error ?? 'Cannot start debug adapter');
      return;
    }

    try {
      // ASSUMED: ép console về integratedTerminal để js-debug gửi runInTerminal → mở terminal tab
      const launchConfig =
        config.request === 'attach'
          ? { ...config, type, __workspaceFolder: projectRoot ?? undefined }
          : {
              ...config,
              type,
              console: 'integratedTerminal',
              __workspaceFolder: projectRoot ?? undefined,
            };
      launchedConfig = config;
      await openSession(launchConfig, true);
    } catch (e: any) {
      failSession(e.message);
    }
  },

  stop: async () => {
    // Debug log - có thể xóa sau khi fix
    console.log('[DEBUG] stop() called:', { status: get().status, sessions: [...sessions.keys()] });
    if (get().status === 'idle') return;
    startToken++;
    const root = [...sessions.values()].find((s) => s.root) ?? [...sessions.values()][0];
    if (root) {
      await Promise.race([
        request(root, 'disconnect', { terminateDebuggee: true }).catch(() => undefined),
        new Promise((resolve) => setTimeout(resolve, DISCONNECT_TIMEOUT_MS)),
      ]);
    }
    endAll();
  },

  restart: async () => {
    keepTerminals = true;
    try {
      await get().stop();
    } finally {
      keepTerminals = false;
    }
    await get().start();
  },

  resume: () => void sendThreadCommand('continue'),
  pause: () => void sendThreadCommand('pause'),
  stepOver: () => void sendThreadCommand('next'),
  stepIn: () => void sendThreadCommand('stepIn'),
  stepOut: () => void sendThreadCommand('stepOut'),
}));

// ─── Session helpers ────────────────────────────────────────────────────
function request(session: Session, command: string, args?: unknown): Promise<any> {
  const seq = ++session.seq;
  return new Promise((resolve, reject) => {
    session.pending.set(seq, { resolve, reject });
    void getApi().invoke('debug:send', session.id, {
      seq,
      type: 'request',
      command,
      arguments: args,
    });
  });
}

function respond(session: Session, m: any, success: boolean, message?: string): void {
  void getApi().invoke('debug:send', session.id, {
    seq: ++session.seq,
    type: 'response',
    request_seq: m.seq,
    command: m.command,
    success,
    ...(message ? { message } : {}),
  });
}

async function openSession(config: Record<string, any>, root: boolean): Promise<void> {
  const session: Session = {
    id: `debug-${++sessionCounter}`,
    seq: 0,
    pending: new Map(),
    threadId: null,
    root,
  };
  sessions.set(session.id, session);

  const connected = await getApi().invoke('debug:connect', { sessionId: session.id });
  if (!connected?.ok) throw new Error(connected?.error ?? 'Cannot connect to debug adapter');

  await request(session, 'initialize', {
    clientID: 'phantoma',
    clientName: 'Phantoma',
    adapterID: config.type,
    linesStartAt1: true,
    columnsStartAt1: true,
    pathFormat: 'path',
    supportsVariableType: true,
    supportsStartDebuggingRequest: true,
    supportsRunInTerminalRequest: true,
  });

  if (root) useDebugStore.setState({ status: 'running' });
  await request(session, config.request === 'attach' ? 'attach' : 'launch', config);
}

function closeSession(session: Session): void {
  session.pending.forEach((p) => p.reject(new Error('Debug session ended')));
  sessions.delete(session.id);
  if (activeSessionId === session.id) activeSessionId = null;
  void getApi().invoke('debug:stop', session.id);
}

let keepTerminals = false;

function endAll(): void {
  // Debug log - có thể xóa sau khi fix
  console.log('[DEBUG] endAll() called:', {
    keepTerminals,
    status: useDebugStore.getState().status,
    sessions: [...sessions.keys()],
  });
  if (!keepTerminals && useDebugStore.getState().status !== 'idle') {
    const terminalSession = resolveWorkspaceSessionId();
    if (terminalSession) {
      useCodeStore
        .getState()
        .requestCloseTerminals(terminalSession, ['debug:launch', 'debug:task']);
    }
  }
  unsubscribers.forEach((off) => off?.());
  unsubscribers = [];
  sessions.forEach((session) => {
    session.pending.forEach((p) => p.reject(new Error('Debug session ended')));
  });
  sessions.clear();
  activeSessionId = null;
  void getApi().invoke('debug:stop-adapter');
  useDebugStore.setState({ status: 'idle' });
}

function failSession(message: string): void {
  if (useDebugStore.getState().status === 'idle') return;
  endAll();
  useDebugStore.setState({ error: message });
}

function attachListeners(): void {
  const api = getApi();
  unsubscribers = [
    api.on('debug:message', (_e: unknown, p: any) => handleMessage(p.sessionId, p.message)),
    api.on('debug:exit', (_e: unknown, p: any) => handleSocketClosed(p.sessionId)),
    // Debug log - có thể xóa sau khi fix
    api.on('debug:output', (_e: unknown, p: any) =>
      console.log(`[DEBUG] ${p.sessionId} output:`, p.text),
    ),
  ];
}

function handleSocketClosed(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (!session) return;
  finishSession(session);
}

function finishSession(session: Session): void {
  // Debug log - có thể xóa sau khi fix
  console.log('[DEBUG] finishSession:', { id: session.id, root: session.root, total: sessions.size });
  closeSession(session);
  const hasChild = [...sessions.values()].some((s) => !s.root);
  if (sessions.size === 0 || (!session.root && !hasChild)) endAll();
}

function pickSession(): Session | undefined {
  const active = activeSessionId ? sessions.get(activeSessionId) : undefined;
  if (active) return active;
  const children = [...sessions.values()].filter((s) => !s.root);
  return children[children.length - 1] ?? [...sessions.values()][0];
}

async function sendThreadCommand(command: string): Promise<void> {
  const session = pickSession();
  if (!session) return;
  try {
    const threadId = session.threadId ?? (await request(session, 'threads'))?.threads?.[0]?.id ?? 1;
    if (command !== 'pause') useDebugStore.setState({ status: 'running' });
    await request(session, command, { threadId });
  } catch (e: any) {
    useDebugStore.setState({ error: e.message });
  }
}

async function syncBreakpoints(session: Session): Promise<void> {
  const { breakpoints } = useDebugStore.getState();
  for (const [file, lines] of Object.entries(breakpoints)) {
    await request(session, 'setBreakpoints', {
      source: { path: file },
      breakpoints: lines.map((line) => ({ line })),
    });
  }
}

// ─── Message handling ───────────────────────────────────────────────────
function handleMessage(sessionId: string, m: any): void {
  const session = sessions.get(sessionId);
  if (!session) return;

  if (m.type === 'response') {
    const pending = session.pending.get(m.request_seq);
    if (!pending) return;
    session.pending.delete(m.request_seq);
    if (m.success) pending.resolve(m.body);
    else pending.reject(new Error(m.message || `${m.command} failed`));
  } else if (m.type === 'event') {
    handleEvent(session, m);
  } else if (m.type === 'request') {
    handleReverseRequest(session, m);
  }
}

function handleReverseRequest(session: Session, m: any): void {
  // Debug log - có thể xóa sau khi fix
  console.log('[DEBUG] reverse request:', m.command, JSON.stringify(m.arguments));
  if (m.command === 'startDebugging') {
    respond(session, m, true);
    const { request: kind, configuration } = m.arguments ?? {};
    void openSession({ ...configuration, request: kind }, false).catch((e: Error) =>
      useDebugStore.setState({ error: e.message }),
    );
    return;
  }
  if (m.command === 'launchVSCode') {
    const vscodeArgs = ((m.arguments?.args ?? []) as Array<{ prefix?: string; path?: string }>)
      .filter((a) => !(a.prefix?.endsWith('=') && a.path === undefined))
      .map((a) => `${a.prefix ?? ''}${a.path ?? ''}`);
    const exe =
      typeof launchedConfig?.runtimeExecutable === 'string'
        ? launchedConfig.runtimeExecutable
        : 'code';
    const cwd =
      typeof launchedConfig?.cwd === 'string' ? launchedConfig.cwd : (projectRoot ?? undefined);
    void getApi()
      .invoke('debug:spawn', { command: exe, args: vscodeArgs, cwd, env: m.arguments?.env ?? {} })
      .then((res: { ok: boolean; error?: string }) => {
        if (!res?.ok) {
          useDebugStore.setState({ error: res?.error ?? 'Cannot launch VS Code' });
          return;
        }
        // ASSUMED: cửa sổ VS Code mới chỉ broadcast attach về VS Code gốc, không về Phantoma → tự attach vào port --inspect-brk-extensions
        const port = Number(vscodeArgs.join(' ').match(/--inspect-brk-extensions=(\d+)/)?.[1]);
        if (!port) return;
        console.log('[DEBUG] attach extension host:', { port });
        void openSession(
          {
            name: 'Extension Host',
            type: 'pwa-extensionHost',
            request: 'attach',
            port,
            timeout: 30000,
            sourceMaps: launchedConfig?.sourceMaps ?? true,
            outFiles: launchedConfig?.outFiles,
            __workspaceFolder: projectRoot ?? undefined,
          },
          false,
        ).catch((e: Error) => useDebugStore.setState({ error: e.message }));
      });
    void getApi().invoke('debug:send', session.id, {
      seq: ++session.seq,
      type: 'response',
      request_seq: m.seq,
      command: m.command,
      success: true,
      body: {},
    });
    return;
  }
  if (m.command === 'runInTerminal') {
    const { args, cwd, env, title } = m.arguments ?? {};
    const sessionId = resolveWorkspaceSessionId();
    if (!sessionId || !Array.isArray(args) || args.length === 0) {
      console.log('[DEBUG] runInTerminal failed:', { sessionId, args });
      respond(session, m, false, 'Cannot open terminal: no workspace tab');
      useDebugStore.setState({ error: 'Cannot open debug terminal: no active workspace tab' });
      return;
    }
    const envArgs = Object.entries((env ?? {}) as Record<string, string | null>).map(([k, v]) =>
      v === null ? `-u ${k}` : `${k}=${quote(v)}`,
    );
    const command = ['env', ...envArgs, ...args.map(quote)].join(' ');
    useCodeStore
      .getState()
      .requestOpenTerminal(sessionId, title ?? 'Debug', command, cwd, 'debug:launch');
    void getApi().invoke('debug:send', session.id, {
      seq: ++session.seq,
      type: 'response',
      request_seq: m.seq,
      command: m.command,
      success: true,
      body: {},
    });
    return;
  }
  respond(session, m, false, `Unsupported request: ${m.command}`);
}

function handleEvent(session: Session, m: any): void {
  // Debug log - có thể xóa sau khi fix
  console.log('[DEBUG] event:', m.event, m.event === 'output' ? m.body?.output : '');
  switch (m.event) {
    case 'initialized':
      void syncBreakpoints(session)
        .then(() => request(session, 'configurationDone'))
        .catch((e: Error) => useDebugStore.setState({ error: e.message }));
      break;
    case 'stopped':
      session.threadId = m.body?.threadId ?? session.threadId;
      activeSessionId = session.id;
      useDebugStore.setState({ status: 'stopped' });
      break;
    case 'continued':
      useDebugStore.setState({ status: 'running' });
      break;
    case 'terminated':
      console.log('[DEBUG] terminated:', { sessionId: session.id, root: session.root });
      finishSession(session);
      break;
  }
}
