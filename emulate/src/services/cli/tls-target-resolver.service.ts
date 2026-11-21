import { execFile } from 'child_process';
import { promises as fs } from 'fs';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const MAX_BUFFER = 32 * 1024 * 1024;

async function which(bin: string): Promise<string | null> {
  if (bin.includes('/')) return bin;
  try {
    const { stdout } = await execFileAsync('which', [bin]);
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

async function realPath(file: string): Promise<string | null> {
  try {
    return await fs.realpath(file);
  } catch {
    return null;
  }
}

async function shebangInterpreter(file: string): Promise<string | null> {
  try {
    const fh = await fs.open(file, 'r');
    try {
      const buf = Buffer.alloc(256);
      const { bytesRead } = await fh.read(buf, 0, 256, 0);
      const first = buf.toString('utf8', 0, bytesRead).split('\n')[0];
      if (!first.startsWith('#!')) return null;
      const parts = first.slice(2).trim().split(/\s+/);
      return parts[0].endsWith('/env') ? (parts[1] ?? null) : (parts[0] ?? null);
    } finally {
      await fh.close();
    }
  } catch {
    return null;
  }
}

async function linksSystemLibssl(file: string): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync('ldd', [file], { maxBuffer: MAX_BUFFER });
    return /libssl\.so/.test(stdout);
  } catch {
    return false;
  }
}

async function exportsSslWrite(file: string): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync('nm', ['-D', file], { maxBuffer: MAX_BUFFER });
    return stdout.includes('SSL_write');
  } catch {
    return false;
  }
}

/**
 * Resolve the binary that actually contains the OpenSSL symbols for a CLI command.
 * Returns undefined when ecapture can auto-detect the system libssl.
 * ASSUMED: the first token of the command line is the executable (no quoted paths with spaces).
 */
export async function resolveTlsBinary(commandLine: string): Promise<string | undefined> {
  const first = commandLine.trim().split(/\s+/)[0];
  if (!first) return undefined;

  const found = await which(first);
  const resolved = found ? await realPath(found) : null;
  if (!resolved) return undefined;

  let target = resolved;
  const interpreter = await shebangInterpreter(resolved);
  if (interpreter) {
    const interpFound = await which(interpreter);
    const interpResolved = interpFound ? await realPath(interpFound) : null;
    if (interpResolved) target = interpResolved;
  }

  if (await linksSystemLibssl(target)) return undefined;
  return (await exportsSslWrite(target)) ? target : undefined;
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function childPids(pid: number): Promise<number[]> {
  try {
    const { stdout } = await execFileAsync('pgrep', ['-P', String(pid)]);
    return stdout.split('\n').map(Number).filter((n) => n > 0);
  } catch {
    return [];
  }
}

async function newestPidMatching(pattern: string): Promise<number | null> {
  try {
    const { stdout } = await execFileAsync('pgrep', ['-n', '-f', '--', pattern]);
    const pid = Number(stdout.trim());
    return pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

// ASSUMED: launcher (vd bin/zed) hoặc exec/spawn con, hoặc thoát và tiến trình thật nằm cùng thư mục cài đặt (cha của bin/) — upgrade path: theo dõi execve bằng eBPF
export async function resolveLivePid(
  pid: number,
  commandLine: string,
): Promise<{ pid: number; exe?: string }> {
  const first = commandLine.trim().split(/\s+/)[0];
  const found = first ? await which(first) : null;
  const real = found ? await realPath(found) : null;
  const root = real ? real.replace(/\/[^/]+\/[^/]+$/, '') : null;

  let current = pid;
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 150));
    if (isAlive(current)) {
      const kids = await childPids(current);
      if (kids.length > 0) {
        current = kids[0];
        continue;
      }
      if (i >= 2) break;
    } else if (root && root.length > 1) {
      const next = await newestPidMatching(root);
      if (next) current = next;
      break;
    }
  }
  const exe = await realPath(`/proc/${current}/exe`);
  return { pid: current, exe: exe ?? undefined };
}