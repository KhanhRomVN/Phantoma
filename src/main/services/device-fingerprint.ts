import { screen } from 'electron';
import { execFile } from 'child_process';
import { promisify } from 'util';
import os from 'os';

const run = promisify(execFile);

export interface DeviceFingerprint {
  family: 'windows' | 'macos' | 'linux';
  os: string;
  browser: string;
  screen: string;
  gpu: string;
  cores: number;
  memory: number;
  lang: string;
  tz: string;
  cc: string;
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
  const major = /(\d+)\.\d+\.\d+\.\d+/.exec(out)?.[1] ?? process.versions.chrome.split('.')[0];
  return `Chrome ${major}`;
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
  const { width, height } = screen.getPrimaryDisplay().size;
  const resolved = Intl.DateTimeFormat().resolvedOptions();
  return {
    ...detectOs(),
    browser,
    screen: `${width}×${height}`,
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