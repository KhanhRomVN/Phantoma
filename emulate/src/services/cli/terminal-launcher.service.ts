import { spawn, execFile } from 'child_process';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

// ASSUMED: Linux desktop; [binary, args that precede the command]
const TERMINALS: Array<[string, string[]]> = [
  ['x-terminal-emulator', ['-e']],
  ['gnome-terminal', ['--']],
  ['konsole', ['-e']],
  ['xfce4-terminal', ['-x']],
  ['kitty', []],
  ['alacritty', ['-e']],
  ['xterm', ['-e']],
];

async function findTerminal(): Promise<[string, string[]] | null> {
  for (const entry of TERMINALS) {
    try {
      await execFileAsync('which', [entry[0]]);
      return entry;
    } catch {
      // try next
    }
  }
  return null;
}

function shQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

/**
 * Open a visible terminal window running the command and return the PID of the real CLI process
 * (the wrapper shell writes its PID to a file, then `exec` replaces itself with the command).
 */
export async function launchInTerminal(commandLine: string, withTerminal = true): Promise<number> {
  if (!withTerminal) {
    const child = spawn('sh', ['-c', `exec ${commandLine}`], { detached: true, stdio: 'ignore' });
    child.on('error', () => {});
    child.unref();
    if (!child.pid) throw new Error('Failed to start the app process');
    return child.pid;
  }
  const term = await findTerminal();
  if (!term) {
    throw new Error('No terminal emulator found (x-terminal-emulator, gnome-terminal, konsole, xterm...)');
  }

  const pidFile = path.join(
    os.tmpdir(),
    `phantoma-cli-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.pid`,
  );
  const script = `echo $$ > ${shQuote(pidFile)}; exec ${commandLine}`;

  const child = spawn(term[0], [...term[1], 'sh', '-c', script], {
    detached: true,
    stdio: 'ignore',
  });
  child.on('error', () => {});
  child.unref();

  for (let i = 0; i < 50; i++) {
    await new Promise((r) => setTimeout(r, 100));
    try {
      const pid = parseInt((await fs.readFile(pidFile, 'utf8')).trim(), 10);
      await fs.rm(pidFile, { force: true });
      if (pid > 0) return pid;
    } catch {
      // pid file not written yet
    }
  }
  throw new Error('Terminal opened but the CLI process did not start (is a display available?)');
}