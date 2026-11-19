import fs from 'fs';
import os from 'os';
import path from 'path';

export interface AppConfig {
  port: number;
  env: string;
  dataDir: string;
  dbPath: string;
  checkTimeoutMs: number;
  checkConcurrency: number;
  monitorIntervalMs: number;
  vpnDir: string;
  warpBin: string;
  foxholeBin: string;
  wireproxyBin: string;
  vpnStartTimeoutMs: number;
}

function expandHome(p: string): string {
  if (!p.startsWith('~')) return p;
  return path.join(os.homedir(), p.slice(1));
}

function getEnv(key: string, defaultVal: string): string {
  const val = process.env[key];
  return val && val !== '' ? val : defaultVal;
}

function localWarpBin(): string {
  const built = path.resolve(process.cwd(), '..', 'temp', 'cloudflare-warp', 'bin', 'warp');
  return fs.existsSync(built) ? built : 'warp';
}

function localWireproxyBin(): string {
  const rel = path.join('temp', 'protonvpn-proxy', 'bin', 'wireproxy');
  const built = [path.resolve(process.cwd(), '..', rel), path.resolve(process.cwd(), rel)].find(
    (p) => fs.existsSync(p),
  );
  return built ?? 'wireproxy';
}

function localFoxholeBin(): string {
  const rel = path.join('temp', 'foxhole-vpn', 'dist', 'cli.js');
  const built = [path.resolve(process.cwd(), '..', rel), path.resolve(process.cwd(), rel)].find(
    (p) => fs.existsSync(p),
  );
  return built ?? 'foxhole';
}

const dataDir = expandHome(getEnv('PROXY_DATA_DIR', '~/.phantoma/proxy'));

const currentConfig: AppConfig = {
  port: parseInt(getEnv('PROXY_PORT', '3044'), 10), // ASSUMED: fallback port 3044 — upgrade path: add DEFAULT_PROXY_PORT to src/renderer/src/config/ports.ts when the renderer integrates
  env: getEnv('ENV', 'development'),
  dataDir,
  dbPath: path.join(dataDir, 'proxy.sql'),
  checkTimeoutMs: parseInt(getEnv('PROXY_CHECK_TIMEOUT_MS', '8000'), 10),
  checkConcurrency: parseInt(getEnv('PROXY_CHECK_CONCURRENCY', '8'), 10),
  monitorIntervalMs: parseInt(getEnv('PROXY_MONITOR_INTERVAL_MS', '30000'), 10), // 0 = tắt giám sát nền
  vpnDir: path.join(dataDir, 'vpn'),
  warpBin: getEnv('PROXY_WARP_BIN', localWarpBin()), // ASSUMED: binaries come from PATH or env — build temp/cloudflare-warp (make cloudflare-warp), temp/foxhole-vpn (npm i -g foxhole-vpn) and install wireproxy
  foxholeBin: getEnv('PROXY_FOXHOLE_BIN', localFoxholeBin()),
  wireproxyBin: getEnv('PROXY_WIREPROXY_BIN', localWireproxyBin()),
  vpnStartTimeoutMs: parseInt(getEnv('PROXY_VPN_START_TIMEOUT_MS', '20000'), 10),
};

if (Number.isNaN(currentConfig.port)) {
  throw new Error('PROXY_PORT must be a valid number');
}

export const getConfig = (): AppConfig => currentConfig;

export const isDevelopment = (): boolean => currentConfig.env === 'development';
