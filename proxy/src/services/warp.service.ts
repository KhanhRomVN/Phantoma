import { spawn, type ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';
import { getConfig } from '../config/server.config';
import { proxyRepository } from '../repositories/proxy.repository';
import { sourceRepository } from '../repositories/source.repository';
import { AppError, found, newId } from '../utils/http';
import { createLogger } from '../utils/logger';
import { collectLogs, freePort, LOCAL_HOST, run, waitForPort } from '../utils/process';
import { proxyService } from './proxy.service';


const logger = createLogger('WarpService');

export const WARP_PROVIDER = 'warp';
const SOURCE_NAME = 'Cloudflare WARP';
const MAX_BATCH = 10;
const REGISTER_TIMEOUT_MS = 60000;

interface Instance {
  child: ChildProcess;
  port: number;
  logs: string[];
  error: string | null;
}

const instances = new Map<string, Instance>();

function warpRoot(): string {
  const dir = path.join(getConfig().vpnDir, WARP_PROVIDER);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

const warpDir = (proxyId: string): string => path.join(warpRoot(), proxyId);

function killInstance(id: string): void {
  const inst = instances.get(id);
  if (!inst) return;
  instances.delete(id);
  inst.child.kill('SIGTERM');
  proxyRepository.update(id, { status: 'dead', latencyMs: null });
}

function requireWarpProxy(id: string) {
  const row = found(proxyRepository.get(id), 'proxy');
  if (row.provider !== WARP_PROVIDER) throw new AppError('not a WARP proxy', 400);
  return row;
}

// every WARP proxy is its own registered device: a private data dir (reg.json, conf.json) and its own process
async function register(license: string): Promise<string> {
  const tmp = path.join(warpRoot(), `pending-${newId()}`);
  fs.mkdirSync(tmp, { recursive: true });
  const bin = getConfig().warpBin;
  try {
    await run(bin, ['--data-dir', tmp, 'generate'], REGISTER_TIMEOUT_MS);
    if (license) await run(bin, ['--data-dir', tmp, 'update', '--license', license], REGISTER_TIMEOUT_MS);
    if (!fs.existsSync(path.join(tmp, 'reg.json'))) throw new AppError('WARP did not create its identity files', 502); // ASSUMED: identity files land directly in --data-dir
    return tmp;
  } catch (err) {
    fs.rmSync(tmp, { recursive: true, force: true });
    throw err;
  }
}

export const warpService = {
  // WARP needs no account, so its source exists from the first start
  ensureSource: (): string => {
    const existing = sourceRepository.findVpn(SOURCE_NAME);
    if (existing) return existing.id as string;
    const id = newId();
    sourceRepository.insert(id, { name: SOURCE_NAME, type: 'vpn', ephemeral: 1 });
    logger.info(`Created source "${SOURCE_NAME}"`);
    return id;
  },

  // WARP devices only keep their session while the server runs, so every start wipes all ephemeral sources' proxies and device data
  purgeAccounts: (): void => {
    for (const s of sourceRepository.list().filter((r) => r.ephemeral === 1)) {
      const ids = proxyRepository.list(s.id).map((r) => r.id as string);
      if (ids.length > 0) proxyRepository.removeMany(ids);
    }
    fs.rmSync(warpRoot(), { recursive: true, force: true });
  },

  status: () => ({
    sourceId: warpService.ensureSource(),
    running: [...instances.keys()],
  }),

  start: async (proxyId: string) => {
    const row = requireWarpProxy(proxyId);
    if (instances.has(proxyId)) throw new AppError(`${row.name} is already running`, 409);
    const dir = warpDir(proxyId);
    if (!fs.existsSync(path.join(dir, 'reg.json'))) throw new AppError(`${row.name} has no WARP identity; delete it and add a new one`, 409);
    const port = await freePort();
    proxyRepository.update(proxyId, { port, status: 'unchecked' });

    const child = spawn(getConfig().warpBin, ['--data-dir', dir, 'run', '--socks-addr', `${LOCAL_HOST}:${port}`], {
      cwd: dir,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const inst: Instance = { child, port, logs: [], error: null };
    instances.set(proxyId, inst);
    collectLogs(inst.logs, child.stdout);
    collectLogs(inst.logs, child.stderr);
    child.on('error', (err) => {
      inst.error = err.message;
    });
    child.on('exit', (code) => {
      logger.info(`${row.name} exited with code ${code}`);
      if (instances.get(proxyId) === inst) {
        instances.delete(proxyId);
        proxyRepository.update(proxyId, { status: 'dead', latencyMs: null });
      }
    });

    const alive = (): boolean => !inst.error && child.exitCode === null;
    if (!(await waitForPort(port, getConfig().vpnStartTimeoutMs, alive))) {
      const reason = inst.error ?? inst.logs.slice(-3).join(' | ');
      killInstance(proxyId);
      throw new AppError(`${row.name} failed to start: ${reason || 'timed out'}`, 502);
    }
    logger.info(`${row.name} ready on ${LOCAL_HOST}:${port}`);
    return proxyService.get(proxyId);
  },

  stop: (proxyId: string) => {
    const row = requireWarpProxy(proxyId);
    if (!instances.has(proxyId)) throw new AppError(`${row.name} is not running`, 409);
    killInstance(proxyId);
    return proxyService.get(proxyId);
  },

  create: async (input: { license?: unknown; count?: unknown }) => {
    const license = typeof input.license === 'string' ? input.license.trim() : '';
    const count = Number(input.count ?? 1);
    if (!Number.isInteger(count) || count < 1 || count > MAX_BATCH) throw new AppError(`count must be an integer between 1 and ${MAX_BATCH}`, 400);
    const sourceId = warpService.ensureSource();
    const created: ReturnType<typeof proxyService.get>[] = [];
    const errors: string[] = [];
    for (let i = 0; i < count; i += 1) {
      try {
        const tmp = await register(license);
        const ordinal = proxyRepository.stats(sourceId).total + 1;
        const proxy = proxyService.create({
          sourceId,
          name: `WARP-${String(ordinal).padStart(2, '0')}`,
          host: LOCAL_HOST,
          port: await freePort(),
          protocol: 'socks5',
          provider: WARP_PROVIDER,
          tags: ['vpn', WARP_PROVIDER],
        });
        fs.renameSync(tmp, warpDir(proxy.id));
        try {
          created.push(await warpService.start(proxy.id));
        } catch (err) {
          created.push(proxyService.get(proxy.id));
          errors.push(err instanceof Error ? err.message : String(err));
        }
      } catch (err) {
        errors.push(err instanceof Error ? err.message : String(err));
      }
    }
    if (created.length === 0) throw new AppError(errors[0] ?? 'could not create WARP proxy', 502);
    return { created, errors };
  },

  // called before proxies are deleted: stop their processes and drop the device identity
  release: (ids: string[]): void => {
    for (const id of ids) {
      const inst = instances.get(id);
      if (inst) {
        instances.delete(id);
        inst.child.kill('SIGTERM');
      }
      const row = proxyRepository.get(id);
      if (row?.provider === WARP_PROVIDER) fs.rmSync(warpDir(id), { recursive: true, force: true });
    }
  },

  stopAll: (): void => {
    for (const id of [...instances.keys()]) killInstance(id);
  },
};

process.once('exit', () => {
  for (const inst of instances.values()) inst.child.kill('SIGTERM');
});