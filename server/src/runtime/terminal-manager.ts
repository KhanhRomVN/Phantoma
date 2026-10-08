/**
 * ------------------------------------------------------------------
 * Terminal Manager (port từ src/main/ipc/terminal.handlers.ts)
 * ------------------------------------------------------------------
 * Quản lý PTY (node-pty). Thay event.sender.send bằng runtimeBus.
 * ------------------------------------------------------------------
 */

import * as os from 'os';
import * as pty from 'node-pty';
import { runtimeBus } from './event-bus';
import { createLogger } from '../utils/logger';

const logger = createLogger('Terminal');

const activePTYs = new Map<string, pty.IPty>();

function getDefaultShell(): string {
  if (process.env.SHELL) return process.env.SHELL;
  return os.platform() === 'win32' ? 'powershell.exe' : '/bin/bash';
}

function getShellArgs(shell: string): string[] {
  const shellName = shell.split('/').pop() || shell;
  switch (shellName) {
    case 'bash':
    case 'zsh':
    case 'fish':
      return ['-l'];
    case 'powershell.exe':
    case 'pwsh':
    case 'pwsh.exe':
      return ['-NoLogo'];
    default:
      return [];
  }
}

export function spawnTerminal(terminalId: string, cwd?: string): { pid: number; shell: string } {
  const shell = getDefaultShell();
  const shellArgs = getShellArgs(shell);

  const existing = activePTYs.get(terminalId);
  if (existing) {
    existing.kill();
    activePTYs.delete(terminalId);
  }

  const ptyProcess = pty.spawn(shell, shellArgs, {
    name: 'xterm-256color',
    cols: 80,
    rows: 24,
    cwd: cwd || process.cwd(),
    env: {
      ...process.env,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
      SHELL: shell,
    },
  });
  activePTYs.set(terminalId, ptyProcess);

  ptyProcess.onData((data: string) => {
    runtimeBus.emitEvent('terminal:data', { terminalId, data });
  });

  ptyProcess.onExit(({ exitCode, signal }) => {
    runtimeBus.emitEvent('terminal:exit', { terminalId, exitCode, signal });
    activePTYs.delete(terminalId);
  });

  return { pid: ptyProcess.pid, shell };
}

export function writeTerminal(terminalId: string, data: string): void {
  activePTYs.get(terminalId)?.write(data);
}

export function resizeTerminal(terminalId: string, cols: number, rows: number): void {
  const ptyProcess = activePTYs.get(terminalId);
  if (ptyProcess) {
    try {
      ptyProcess.resize(cols, rows);
    } catch {
      logger.warn(`Failed to resize PTY ${terminalId}, it may have exited`);
    }
  }
}

export function killTerminal(terminalId: string): void {
  const ptyProcess = activePTYs.get(terminalId);
  if (ptyProcess) {
    ptyProcess.kill();
    activePTYs.delete(terminalId);
  }
}