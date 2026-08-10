import { ipcMain } from 'electron';
import * as pty from 'node-pty';
import * as os from 'os';

// Track active PTY processes: Map<terminalId, PTY>
const activePTYs = new Map<string, pty.IPty>();

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
  console.log('[Main] 🚀 Setting up terminal handlers');

  // Spawn a new PTY and pipe I/O
  // Now accepts terminalId parameter for multiple terminals
  ipcMain.handle('terminal:spawn', (event, terminalId: string) => {
    console.log('[Main] 🆕 terminal:spawn called for:', terminalId);
    const shell = getDefaultShell();
    const shellArgs = getShellArgs(shell);
    console.log('[Main] 🐚 Shell detected:', shell);
    console.log('[Main] 📋 Shell args:', shellArgs);
    console.log('[Main] 🏠 HOME directory:', process.env.HOME);
    console.log('[Main] 📂 cwd fallback:', process.cwd());

    // Kill existing PTY for this terminalId if any
    const existing = activePTYs.get(terminalId);
    if (existing) {
      console.log('[Main] 🔪 Killing existing PTY for:', terminalId);
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

    console.log('[Main] ⚙️  Spawn options:', {
      name: spawnOptions.name,
      cols: spawnOptions.cols,
      rows: spawnOptions.rows,
      cwd: spawnOptions.cwd,
      shell: shell,
      args: shellArgs,
    });

    const ptyProcess = pty.spawn(shell, shellArgs, spawnOptions);
    console.log('[Main] ✅ PTY spawned, PID:', ptyProcess.pid);

    activePTYs.set(terminalId, ptyProcess);
    console.log('[Main] 📊 Active PTYs count:', activePTYs.size);

    // Pipe PTY output → renderer
    ptyProcess.onData((data: string) => {
      console.log('[Main] 📥 PTY data:', { terminalId, length: data.length, preview: data.substring(0, 50) });
      event.sender.send('terminal:data', { terminalId, data });
    });

    // Handle PTY exit
    ptyProcess.onExit(({ exitCode, signal }) => {
      console.log('[Main] 💀 PTY exited:', { terminalId, exitCode, signal });
      event.sender.send('terminal:exit', { terminalId, exitCode, signal });
      activePTYs.delete(terminalId);
    });

    return { pid: ptyProcess.pid, shell };
  });

  // Write data from renderer → PTY
  // Now accepts { terminalId, data } payload
  ipcMain.on('terminal:write', (event, payload: { terminalId: string; data: string }) => {
    console.log('[Main] 📤 terminal:write:', { 
      terminalId: payload.terminalId, 
      length: payload.data.length,
      charCodes: Array.from(payload.data).map(c => c.charCodeAt(0)),
      preview: payload.data.substring(0, 50),
    });
    
    const ptyProcess = activePTYs.get(payload.terminalId);
    if (ptyProcess) {
      ptyProcess.write(payload.data);
      console.log('[Main] ✅ Data written to PTY');
    } else {
      console.log('[Main] ❌ PTY not found for:', payload.terminalId);
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
