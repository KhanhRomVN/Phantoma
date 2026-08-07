import { ipcMain } from 'electron';
import * as pty from 'node-pty';
import * as os from 'os';

// Track active PTY processes per window/session
const activePTYs = new Map<string, pty.IPty>();

function getDefaultShell(): string {
  // Prefer $SHELL, fallback to platform-appropriate shell
  if (process.env.SHELL) {
    return process.env.SHELL;
  }
  return os.platform() === 'win32' ? 'powershell.exe' : '/bin/bash';
}

export function setupTerminalHandlers(): void {
  // Spawn a new PTY and pipe I/O
  ipcMain.handle('terminal:spawn', (event) => {
    const shell = getDefaultShell();
    const webContentsId = event.sender.id;
    const key = String(webContentsId);

    // Kill existing PTY for this webContents if any
    const existing = activePTYs.get(key);
    if (existing) {
      existing.kill();
      activePTYs.delete(key);
    }

    const ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      cwd: process.cwd(),
      env: {
        ...process.env,
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor',
      },
    });

    activePTYs.set(key, ptyProcess);

    // Pipe PTY output → renderer
    ptyProcess.onData((data: string) => {
      event.sender.send('terminal:data', data);
    });

    // Handle PTY exit
    ptyProcess.onExit(({ exitCode, signal }) => {
      event.sender.send('terminal:exit', { exitCode, signal });
      activePTYs.delete(key);
    });

    return { pid: ptyProcess.pid, shell };
  });

  // Write data from renderer → PTY
  ipcMain.on('terminal:write', (event, data: string) => {
    const key = String(event.sender.id);
    const ptyProcess = activePTYs.get(key);
    if (ptyProcess) {
      ptyProcess.write(data);
    }
  });

  // Resize PTY when terminal dimensions change
  ipcMain.on('terminal:resize', (event, { cols, rows }: { cols: number; rows: number }) => {
    const key = String(event.sender.id);
    const ptyProcess = activePTYs.get(key);
    if (ptyProcess) {
      try {
        ptyProcess.resize(cols, rows);
      } catch {
        // PTY may have already exited
      }
    }
  });

  // Kill PTY on explicit close
  ipcMain.handle('terminal:kill', (event) => {
    const key = String(event.sender.id);
    const ptyProcess = activePTYs.get(key);
    if (ptyProcess) {
      ptyProcess.kill();
      activePTYs.delete(key);
    }
  });
}