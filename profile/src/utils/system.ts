import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFile, spawn } from 'child_process';
import { promisify } from 'util';

const run = promisify(execFile);

export interface DeviceFingerprint {
  family: 'windows' | 'macos' | 'linux';
  os: string;
  browser: string;
  gpu: string;
  cores: number;
  memory: number;
  lang: string;
  tz: string;
  cc: string;
}

export function chromeDefaultDir(): string {
  if (process.platform === 'win32') {
    return path.join(process.env.LOCALAPPDATA ?? path.join(os.homedir(), 'AppData', 'Local'), 'Google', 'Chrome', 'User Data');
  }
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'Google', 'Chrome');
  }
  return path.join(os.homedir(), '.config', 'google-chrome');
}

export async function validateFolder(target: string): Promise<{ valid: boolean; reason?: string }> {
  if (!path.isAbsolute(target)) return { valid: false, reason: 'Path must be absolute' };
  try {
    const info = await fs.promises.stat(target);
    if (!info.isDirectory()) return { valid: false, reason: 'This path is not a folder' };
    await fs.promises.access(target, fs.constants.R_OK | fs.constants.W_OK);
    return { valid: true };
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') return { valid: false, reason: 'Folder does not exist' };
    if (code === 'EACCES' || code === 'EPERM') return { valid: false, reason: 'No read/write permission for this folder' };
    return { valid: false, reason: 'Cannot access this folder' };
  }
}

export function openPath(target: string): Promise<boolean> {
  const [cmd, args] =
    process.platform === 'win32'
      ? ['explorer', [target]]
      : process.platform === 'darwin'
        ? ['open', [target]]
        : ['xdg-open', [target]];
  return new Promise((resolve) => {
    const child = spawn(cmd as string, args as string[], { detached: true, stdio: 'ignore' });
    child.once('error', () => resolve(false));
    child.once('spawn', () => {
      child.unref();
      resolve(true);
    });
  });
}

async function exec(file: string, args: string[]): Promise<string> {
  try {
    const { stdout } = await run(file, args, { timeout: 4000, windowsHide: true });
    return stdout;
  } catch {
    return '';
  }
}

async function detectGpu(): Promise<string> {
  if (process.platform === 'darwin') {
    const out = await exec('system_profiler', ['SPDisplaysDataType']);
    return /Chipset Model:\s*(.+)/.exec(out)?.[1].trim() ?? 'Unknown GPU';
  }
  if (process.platform === 'win32') {
    const out = await exec('powershell', [
      '-NoProfile',
      '-Command',
      '(Get-CimInstance Win32_VideoController | Select-Object -First 1).Name',
    ]);
    return out.trim() || 'Unknown GPU';
  }
  const out = await exec('lspci', []);
  const line = out.split('\n').find((l) => /vga|3d|display/i.test(l));
  if (!line) return 'Unknown GPU';
  return line
    .split(': ')
    .slice(1)
    .join(': ')
    .replace(/\s*\(rev .*\)$/, '')
    .trim();
}

async function detectChrome(): Promise<string> {
  let out = '';
  if (process.platform === 'darwin') {
    out = await exec('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--version']);
  } else if (process.platform === 'win32') {
    out = await exec('reg', ['query', 'HKCU\\Software\\Google\\Chrome\\BLBeacon', '/v', 'version']);
  } else {
    out = await exec('google-chrome', ['--version']);
  }
  const major = /(\d+)\.\d+\.\d+\.\d+/.exec(out)?.[1] ?? process.versions.chrome?.split('.')[0];
  return major ? `Chrome ${major}` : 'Chrome';
}

function detectOs(): Pick<DeviceFingerprint, 'family' | 'os'> {
  if (process.platform === 'win32') {
    const build = Number(os.release().split('.')[2] ?? 0);
    return { family: 'windows', os: build >= 22000 ? 'Windows 11' : 'Windows 10' };
  }
  if (process.platform === 'darwin') {
    return { family: 'macos', os: `macOS ${Number(os.release().split('.')[0]) - 9}` };
  }
  return { family: 'linux', os: 'Linux' };
}

async function build(): Promise<DeviceFingerprint> {
  const [gpu, browser] = await Promise.all([detectGpu(), detectChrome()]);
  const resolved = Intl.DateTimeFormat().resolvedOptions();
  return {
    ...detectOs(),
    browser,
    gpu,
    cores: os.cpus().length,
    memory: Math.round(os.totalmem() / 1024 ** 3),
    lang: resolved.locale,
    tz: resolved.timeZone,
    cc: resolved.locale.split('-')[1] ?? 'US',
  };
}

let cache: Promise<DeviceFingerprint> | null = null;

export function getDeviceFingerprint(): Promise<DeviceFingerprint> {
  cache ??= build();
  return cache;
}