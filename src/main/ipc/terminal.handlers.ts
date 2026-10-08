/**
 * ------------------------------------------------------------------
 * IPC handler terminal
 * ------------------------------------------------------------------
 * IPC handler cho các phiên terminal dựa trên PTY. Tạo tiến trình
 * node-pty và truyền I/O giữa renderer và shell.
 *
 * Hàm chính:
 * - setupTerminalHandlers() : Đăng ký IPC handler terminal:
 * - getDefaultShell()       : Xác định shell mặc định của người dùng
 * - getShellArgs()          : Lấy tham số khởi chạy shell
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Electron ──
import { ipcMain } from 'electron';

// ── Node.js ──
import * as os from 'os';
import * as fs from 'fs';

// ── External ──
import * as pty from 'node-pty';

// ── Internal ──
import { logger } from '../utils/logger';

// ─── Constants ──────────────────────────────────────────────────────────
// Track active PTY processes: Map<terminalId, PTY>
const activePTYs = new Map<string, pty.IPty>();

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

export function setupTerminalHandlers(): void {
  // Spawn a new PTY and pipe I/O
  // Now accepts terminalId parameter for multiple terminals
  ipcMain.handle('terminal:spawn', (event, payload: { terminalId: string; cwd?: string }) => {
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
    // Pipe PTY output → renderer
    ptyProcess.onData((data: string) => {
      event.sender.send('terminal:data', { terminalId, data });
    });

    // Handle PTY exit
    ptyProcess.onExit(({ exitCode, signal }) => {
      event.sender.send('terminal:exit', { terminalId, exitCode, signal });
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