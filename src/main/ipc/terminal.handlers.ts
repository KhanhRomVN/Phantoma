/**
 * ------------------------------------------------------------------
 * IPC Terminal Handlers
 * ------------------------------------------------------------------
 * Cung cấp môi trường dòng lệnh ảo (Virtual Terminal) cho ứng dụng.
 * Sử dụng thư viện `node-pty` để spawn các pseudo-terminal thực thụ,
 * cho phép Renderer tương tác trực tiếp với Bash/Zsh/Fish/PowerShell
 * như thể đang gõ phím thật. Hỗ trợ resize, kill process và stream output.
 *
 * Constants:
 * - activePTYs : Map lưu trữ reference đến các instance pty.IPty đang chạy
 *
 * Channels:
 * - terminal:spawn  : Khởi tạo một phiên PTY mới với cwd và env tùy chỉnh
 * - terminal:write  : Gửi keystroke/data vào stdin của PTY
 * - terminal:resize : Cập nhật kích thước cột/dòng cho PTY (sync với UI)
 * - terminal:kill   : Hủy diệt process PTY và giải phóng tài nguyên
 *
 * Functions:
 * - setupTerminalHandlers() : Entry point đăng ký IPC handler nhóm 'terminal:'
 *
 * Utils:
 * - getDefaultShell()       : Resolver shell executable dựa trên biến môi trường $SHELL
 * - getShellArgs()          : Strategy pattern trả về flags khởi động đúng cho bash/zsh/fish/powershell
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Electron ──
import { app, ipcMain } from 'electron';

// ── Node.js ──
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { execFile } from 'child_process';

// ── External ──
import * as pty from 'node-pty';

// ── Internal ──
import { logger } from '../utils/logger';

// ─── Constants ──────────────────────────────────────────────────────────
// Track active PTY processes: Map<terminalId, PTY>
const activePTYs = new Map<string, pty.IPty>();

interface TerminalMeta {
  sender: Electron.WebContents;
  panelId?: string;
  sessionId?: string;
  signature: string;
}

interface ProcessEntry {
  pid: number;
  ppid: number;
  args: string;
}

const terminalMeta = new Map<string, TerminalMeta>();
const PROCESS_POLL_INTERVAL_MS = 2000;
let processPollTimer: NodeJS.Timeout | null = null;
let isPollingProcesses = false;

function runCommand(command: string, args: string[]): Promise<string> {
  return new Promise((resolve) => {
    execFile(command, args, { timeout: 3000, maxBuffer: 4 * 1024 * 1024 }, (_err, stdout) => {
      resolve(stdout || '');
    });
  });
}

async function readProcessTable(): Promise<Map<number, ProcessEntry>> {
  const output = await runCommand('ps', ['-axo', 'pid=,ppid=,args=']);
  const table = new Map<number, ProcessEntry>();
  for (const line of output.split('\n')) {
    const match = line.match(/^\s*(\d+)\s+(\d+)\s+(.*)$/);
    if (match) {
      const pid = Number(match[1]);
      table.set(pid, { pid, ppid: Number(match[2]), args: match[3].trim() });
    }
  }
  return table;
}

async function readListeningPorts(): Promise<Map<number, number[]>> {
  const result = new Map<number, number[]>();
  const add = (pid: number, port: number): void => {
    if (!pid || !port) return;
    const ports = result.get(pid) ?? [];
    if (!ports.includes(port)) ports.push(port);
    result.set(pid, ports);
  };

  if (os.platform() === 'linux') {
    const ssOutput = await runCommand('ss', ['-ltnpH']);
    for (const line of ssOutput.split('\n')) {
      const columns = line.trim().split(/\s+/);
      if (columns.length < 5) continue;
      const port = Number(columns[3].slice(columns[3].lastIndexOf(':') + 1));
      for (const match of line.matchAll(/pid=(\d+)/g)) add(Number(match[1]), port);
    }
    return result;
  }

  const lsofOutput = await runCommand('lsof', ['-nP', '-iTCP', '-sTCP:LISTEN', '-Fpn']);
  let currentPid = 0;
  for (const line of lsofOutput.split('\n')) {
    if (line.startsWith('p')) {
      currentPid = Number(line.slice(1));
    } else if (line.startsWith('n')) {
      add(currentPid, Number(line.slice(line.lastIndexOf(':') + 1)));
    }
  }
  return result;
}

function collectDescendants(rootPid: number, children: Map<number, number[]>): number[] {
  const descendants: number[] = [];
  const queue = [rootPid];
  while (queue.length > 0) {
    const pid = queue.shift()!;
    for (const child of children.get(pid) ?? []) {
      descendants.push(child);
      queue.push(child);
    }
  }
  return descendants;
}

function emitTerminalProcessInfo(
  terminalId: string,
  meta: TerminalMeta,
  command: string,
  ports: number[],
  alive: boolean,
): void {
  const signature = JSON.stringify({ command, ports, alive });
  if (signature === meta.signature || meta.sender.isDestroyed()) return;
  meta.signature = signature;
  meta.sender.send('terminal:process-info', {
    terminalId,
    panelId: meta.panelId,
    sessionId: meta.sessionId,
    command,
    ports,
    alive,
  });
}

async function pollTerminalProcesses(): Promise<void> {
  if (isPollingProcesses || terminalMeta.size === 0) return;
  isPollingProcesses = true;
  try {
    const [table, listening] = await Promise.all([readProcessTable(), readListeningPorts()]);
    const children = new Map<number, number[]>();
    for (const { pid, ppid } of table.values()) {
      const siblings = children.get(ppid) ?? [];
      siblings.push(pid);
      children.set(ppid, siblings);
    }

    for (const [terminalId, meta] of terminalMeta) {
      const ptyProcess = activePTYs.get(terminalId);
      if (!ptyProcess) continue;
      const direct = children.get(ptyProcess.pid) ?? [];
      const foregroundPid = direct[direct.length - 1];
      const command = foregroundPid ? (table.get(foregroundPid)?.args ?? '') : '';
      const ports = [ptyProcess.pid, ...collectDescendants(ptyProcess.pid, children)].flatMap(
        (pid) => listening.get(pid) ?? [],
      );
      emitTerminalProcessInfo(
        terminalId,
        meta,
        command,
        [...new Set(ports)].sort((a, b) => a - b),
        true,
      );
    }
  } finally {
    isPollingProcesses = false;
  }
}

function startProcessPolling(): void {
  if (processPollTimer || os.platform() === 'win32') return;
  processPollTimer = setInterval(() => {
    void pollTerminalProcesses();
  }, PROCESS_POLL_INTERVAL_MS);
}

function stopProcessPollingIfIdle(): void {
  if (terminalMeta.size > 0 || !processPollTimer) return;
  clearInterval(processPollTimer);
  processPollTimer = null;
}

// ─── Functions ──────────────────────────────────────────────────────────
function getDefaultShell(): string {
  // Prefer $SHELL, fallback to platform-appropriate shell
  if (process.env.SHELL) {
    return process.env.SHELL;
  }
  return os.platform() === 'win32' ? 'powershell.exe' : '/bin/bash';
}

function getShellArgs(shell: string): string[] {
  // Use INTERACTIVE NON-LOGIN mode to preserve the CWD passed by node-pty.
  // Login shells (-l) often source profiles that may inadvertently change directory
  // or override environment variables, causing the terminal to land in $HOME instead of project dir.
  // Most modern terminals (VS Code, iTerm2) use interactive non-login shells for new tabs.
  const shellName = shell.split('/').pop() || shell;

  switch (shellName) {
    case 'bash':
      return ['-i']; // Interactive, non-login. Sources .bashrc but respects initial CWD.
    case 'zsh':
      return ['-i']; // Interactive, non-login. Sources .zshrc.
    case 'fish':
      return [];     // Fish is interactive by default when attached to a TTY.
    case 'powershell.exe':
    case 'pwsh':
    case 'pwsh.exe':
      return ['-NoLogo', '-NoExit']; // Keep window open on error
    default:
      return [];
  }
}

const HISTORY_MAX_CHARS = 2 * 1024 * 1024;
const deletedHistoryPanels = new Set<string>();

const historyFile = (panelId: string) =>
  path.join(
    app.getPath('userData'),
    'terminal-history',
    `${panelId.replace(/[^a-zA-Z0-9_-]/g, '_')}.txt`,
  );

export function setupTerminalHandlers(): void {
  ipcMain.on('terminal:history-save', (_event, payload: { panelId: string; data: string }) => {
    if (!payload?.panelId || typeof payload.data !== 'string') return;
    if (payload.data.length > HISTORY_MAX_CHARS || deletedHistoryPanels.has(payload.panelId)) return;
    try {
      const file = historyFile(payload.panelId);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, payload.data);
    } catch (err) {
      logger.error('[Terminal] Failed to save history:', err);
    }
  });

  ipcMain.handle('terminal:history-load', (_event, panelId: string) => {
    try {
      const file = historyFile(panelId);
      return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
    } catch (err) {
      logger.error('[Terminal] Failed to load history:', err);
      return '';
    }
  });

  ipcMain.on('terminal:history-delete', (_event, panelId: string) => {
    if (!panelId) return;
    deletedHistoryPanels.add(panelId);
    try {
      fs.rmSync(historyFile(panelId), { force: true });
    } catch (err) {
      logger.error('[Terminal] Failed to delete history:', err);
    }
  });

  // Spawn a new PTY and pipe I/O
  // Now accepts terminalId parameter for multiple terminals
  ipcMain.handle('terminal:spawn', (event, payload: { terminalId: string; cwd?: string; panelId?: string; sessionId?: string }) => {
    const terminalId = payload.terminalId;
    const shell = getDefaultShell();
    const shellArgs = getShellArgs(shell);

    // Kill existing PTY for this terminalId if any
    const existing = activePTYs.get(terminalId);
    if (existing) {
      existing.kill();
      activePTYs.delete(terminalId);
    }

    // Validate CWD to prevent chdir(2) failed errors if project folder is missing
    let safeCwd = payload.cwd || os.homedir();
    
    try {
      if (!fs.existsSync(safeCwd)) {
        logger.warn(`[Terminal] CWD "${safeCwd}" does not exist. Falling back to home directory.`);
        safeCwd = os.homedir();
      }
    } catch (err) {
      logger.error(`[Terminal] Error checking CWD existence:`, err);
      safeCwd = os.homedir();
    }

    const spawnOptions = {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      cwd: safeCwd,
      env: {
        ...process.env,
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor',
        SHELL: shell,
      },
    };

    const ptyProcess = pty.spawn(shell, shellArgs, spawnOptions);
    activePTYs.set(terminalId, ptyProcess);
    terminalMeta.set(terminalId, {
      sender: event.sender,
      panelId: payload.panelId,
      sessionId: payload.sessionId,
      signature: '',
    });
    startProcessPolling();
    // Pipe PTY output → renderer
    ptyProcess.onData((data: string) => {
      event.sender.send('terminal:data', { terminalId, data });
    });

    // Handle PTY exit
    ptyProcess.onExit(({ exitCode, signal }) => {
      console.log('[DEBUG] terminal pty exit', { terminalId, pid: ptyProcess.pid, exitCode, signal, cwd: safeCwd });
      event.sender.send('terminal:exit', { terminalId, exitCode, signal });
      const meta = terminalMeta.get(terminalId);
      if (meta) emitTerminalProcessInfo(terminalId, meta, '', [], false);
      terminalMeta.delete(terminalId);
      stopProcessPollingIfIdle();
      activePTYs.delete(terminalId);
    });

    return { pid: ptyProcess.pid, shell };
  });

  // Write data from renderer → PTY
  // Now accepts { terminalId, data } payload
  ipcMain.on('terminal:write', (event, payload: { terminalId: string; data: string }) => {
    const ptyProcess = activePTYs.get(payload.terminalId);
    if (ptyProcess) {
      ptyProcess.write(payload.data);
    }
  });

  // Resize PTY when terminal dimensions change
  // Now accepts { terminalId, cols, rows } payload
  ipcMain.on(
    'terminal:resize',
    (event, payload: { terminalId: string; cols: number; rows: number }) => {
      const ptyProcess = activePTYs.get(payload.terminalId);
      if (ptyProcess) {
        try {
          ptyProcess.resize(payload.cols, payload.rows);
        } catch {
          // PTY may have already exited
          logger.warn(`[Terminal] Failed to resize PTY ${payload.terminalId}, it may have exited`);
        }
      }
    },
  );

  ipcMain.handle('terminal:kill-foreground', async (_event, terminalId: string) => {
    const ptyProcess = activePTYs.get(terminalId);
    if (!ptyProcess) return false;
    const table = await readProcessTable();
    const children = new Map<number, number[]>();
    for (const { pid, ppid } of table.values()) {
      const siblings = children.get(ppid) ?? [];
      siblings.push(pid);
      children.set(ppid, siblings);
    }
    const targets = collectDescendants(ptyProcess.pid, children).reverse();
    for (const pid of targets) {
      try {
        process.kill(pid, 'SIGTERM');
      } catch {
        logger.warn(`[Terminal] Failed to SIGTERM pid ${pid}`);
      }
    }
    return targets.length > 0;
  });

  // Kill PTY on explicit close
  // Now accepts terminalId parameter
  ipcMain.handle('terminal:kill', (event, terminalId: string) => {
    const ptyProcess = activePTYs.get(terminalId);
    if (ptyProcess) {
      ptyProcess.kill();
      activePTYs.delete(terminalId);
    }
  });
}