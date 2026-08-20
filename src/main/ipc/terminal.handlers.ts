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
  // Return appropriate args to start shell in interactive login mode
  // This ensures .bashrc, .zshrc, etc. are loaded
  const shellName = shell.split('/').pop() || shell;

  switch (shellName) {
    case 'bash':
      return ['-l']; // login shell - sources .bash_profile, .bashrc
    case 'zsh':
      return ['-l']; // login shell - sources .zprofile, .zshrc
    case 'fish':
      return ['-l']; // login shell
    case 'powershell.exe':
    case 'pwsh':
    case 'pwsh.exe':
      return ['-NoLogo']; // skip logo
    default:
      return [];
  }
}

export function setupTerminalHandlers(): void {
  // Spawn a new PTY and pipe I/O
  // Now accepts terminalId parameter for multiple terminals
  ipcMain.handle('terminal:spawn', (event, terminalId: string) => {
    const shell = getDefaultShell();
    const shellArgs = getShellArgs(shell);

    // Kill existing PTY for this terminalId if any
    const existing = activePTYs.get(terminalId);
    if (existing) {
      existing.kill();
      activePTYs.delete(terminalId);
    }

    const spawnOptions = {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      cwd: process.cwd(),
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