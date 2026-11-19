import { execFile, spawn, type ChildProcess } from 'child_process';
import fs from 'fs';
import net from 'net';
import path from 'path';
import { getConfig } from '../config/server.config';
import { mapProxy, type Row } from '../domain/mappers';
import { accountRepository } from '../repositories/account.repository';
import { proxyRepository } from '../repositories/proxy.repository';
import { sourceRepository } from '../repositories/source.repository';
import { AppError, found, newId, requireString } from '../utils/http';
import { createLogger } from '../utils/logger';
import { captureFxaLogin } from './fxa-cdp.service';
import { probeProxy } from './probe.service';

const logger = createLogger('VpnService');

const HOST = '127.0.0.1';
const LOG_LINES = 50;
const ACTIVATE_TIMEOUT_MS = 60000;

type Creds = Record<string, string>;

interface FieldDef {
  key: string;
  label: string;
  secret?: boolean;
  required?: boolean;
  placeholder?: string;
}

interface Launch {
  command: string;
  args: string[];
  env?: NodeJS.ProcessEnv;
}

interface VpnProvider {
  id: string;
  label: string;
  description: string;
  url: string;
  activation: string;
  fields: FieldDef[];
  // makes the account usable; the returned state is merged into the stored credentials
  activate: (dir: string, creds: Creds) => Promise<Creds>;
  launch: (dir: string, port: number, creds: Creds) => Launch;
}

// vpn proxies live only in memory (never in the proxies table); proxyId is `vpn:<sourceId>:<port>` once registered
interface Instance {
  child: ChildProcess;
  port: number;
  proxyId: string | null;
  accountId: string | null;
  startedAt: number;
  logs: string[];
  error: string | null;
  name: string;
  provider: string;
  country: string;
  status: string;
  latencyMs: number | null;
  exitIp: string;
  lastMessage: string;
  lastChecked: number | null;
}

function foxholeHome(dir: string): string {
  const home = path.join(dir, 'home');
  fs.mkdirSync(home, { recursive: true });
  return home;
}

function writeFoxholeAccounts(
  home: string,
  login: { uid: string; email: string; sessionToken: string },
): void {
  const cfg = path.join(home, '.config', 'foxhole-vpn');
  fs.mkdirSync(cfg, { recursive: true, mode: 0o700 });
  const body = { current: login.uid, firefox: false, own: [login], lowSeen: {} };
  fs.writeFileSync(path.join(cfg, 'accounts.json'), JSON.stringify(body, null, 2) + '\n', {
    mode: 0o600,
  });
}

function run(command: string, args: string[], env?: NodeJS.ProcessEnv): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(command, args, { timeout: ACTIVATE_TIMEOUT_MS, env }, (err, stdout, stderr) => {
      if (err) {
        const detail = (stderr || err.message).trim().split('\n').slice(-2).join(' ');
        reject(new AppError(`${command} ${args.join(' ')} failed: ${detail}`, 502));
        return;
      }
      resolve(stdout);
    });
  });
}

function readIfExists(file: string): string {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function restoreWarpIdentity(dir: string, creds: Creds): void {
  if (creds.reg) fs.writeFileSync(path.join(dir, 'reg.json'), creds.reg, { mode: 0o600 });
  if (creds.conf) fs.writeFileSync(path.join(dir, 'conf.json'), creds.conf, { mode: 0o600 });
}

function protonConfig(port: number, creds: Creds): string {
  return [
    '[Interface]',
    `PrivateKey = ${creds.privateKey}`,
    'Address = 10.2.0.2/32',
    'DNS = 10.2.0.1',
    '',
    '[Peer]',
    `PublicKey = ${creds.peerPublicKey}`,
    'AllowedIPs = 0.0.0.0/0, ::/0',
    `Endpoint = ${creds.endpoint}`,
    'PersistentKeepalive = 25',
    '',
    '[Socks5]',
    `BindAddress = ${HOST}:${port}`,
    '',
  ].join('\n');
}

const ENDPOINT_RE = /^[^\s:]+:\d{1,5}$/;

const PROVIDERS: VpnProvider[] = [
  {
    id: 'warp',
    label: 'Cloudflare WARP',
    description: 'SOCKS5 proxy over Cloudflare WARP (temp/cloudflare-warp)',
    url: 'https://one.one.one.one/',
    activation: 'Register a WARP device',
    fields: [{ key: 'license', label: 'WARP+ license key', secret: true, placeholder: 'Optional' }],
    activate: async (dir, creds) => {
      const bin = getConfig().warpBin;
      restoreWarpIdentity(dir, creds);
      await run(bin, ['--data-dir', dir, 'generate']);
      if (creds.license) await run(bin, ['--data-dir', dir, 'update', '--license', creds.license]);
      const reg = readIfExists(path.join(dir, 'reg.json')); // ASSUMED: identity files land directly in --data-dir
      const conf = readIfExists(path.join(dir, 'conf.json'));
      if (!reg || !conf)
        throw new AppError('WARP did not create its identity files (reg.json, conf.json)', 502);
      return { reg, conf };
    },
    launch: (dir, port, creds) => {
      restoreWarpIdentity(dir, creds);
      return {
        command: getConfig().warpBin,
        args: ['--data-dir', dir, 'run', '--socks-addr', `${HOST}:${port}`],
      };
    },
  },
  {
    id: 'foxhole',
    label: 'Foxhole VPN',
    description: "SOCKS5/HTTP proxy over Firefox's free VPN (temp/foxhole-vpn)",
    url: 'https://vpn.mozilla.org/',
    activation: 'Sign in to Mozilla in Chrome',
    fields: [{ key: 'country', label: 'Country code', placeholder: 'US (optional)' }],
    activate: async (dir, creds) => {
      const login = await captureFxaLogin(300000, {
        userDataDir: creds.userDataDir || undefined,
        profileDirectory: creds.profileDirectory || undefined,
      });
      if (!login)
        throw new AppError('Mozilla sign-in was not completed (window closed or timed out)', 408);
      const home = foxholeHome(dir);
      writeFoxholeAccounts(home, login);
      await run(getConfig().foxholeBin, ['doctor'], { ...process.env, HOME: home });
      return { uid: login.uid, email: login.email, sessionToken: login.sessionToken };
    },
    launch: (dir, port, creds) => {
      const args = ['proxy', '--host', HOST, '--port', String(port)];
      if (creds.country) args.push('--country', creds.country.toUpperCase());
      const home = foxholeHome(dir);
      writeFoxholeAccounts(home, {
        uid: creds.uid,
        email: creds.email,
        sessionToken: creds.sessionToken,
      });
      return { command: getConfig().foxholeBin, args, env: { ...process.env, HOME: home } };
    },
  },
  {
    id: 'proton',
    label: 'ProtonVPN',
    description: 'SOCKS5 proxy over ProtonVPN WireGuard via wireproxy (temp/protonvpn-proxy)',
    url: 'https://protonvpn.com/',
    activation: 'Validate the WireGuard credentials',
    fields: [
      { key: 'email', label: 'Email', placeholder: 'you@proton.me' },
      { key: 'privateKey', label: 'WireGuard private key', secret: true, required: true },
      { key: 'peerPublicKey', label: 'Peer public key', required: true },
      { key: 'endpoint', label: 'Endpoint', required: true, placeholder: '149.102.251.97:51820' },
    ],
    activate: async (_dir, creds) => {
      if (!ENDPOINT_RE.test(creds.endpoint))
        throw new AppError('endpoint must look like host:port', 400);
      return {};
    },
    launch: (dir, port, creds) => {
      const conf = path.join(dir, 'wireproxy.conf');
      fs.writeFileSync(conf, protonConfig(port, creds), { mode: 0o600 });
      return { command: getConfig().wireproxyBin, args: ['-c', conf] };
    },
  },
];

const instances = new Map<string, Instance>();

function getProvider(id: unknown): VpnProvider {
  const provider = PROVIDERS.find((p) => p.id === id);
  if (!provider) throw new AppError(`unknown vpn provider "${String(id)}"`, 404);
  return provider;
}

// ASSUMED: a managed vpn source is recognised by its built-in name (sources.name is the provider label); its id is the vpn "account" id the API has always used
function providerOf(row: Row): VpnProvider {
  const p =
    row.type === 'vpn' ? PROVIDERS.find((x) => x.id !== 'warp' && x.label === row.name) : undefined;
  if (!p) throw new AppError(`source "${String(row.name)}" is not a managed vpn source`, 404);
  return p;
}

function requireAccount(id: string): Row {
  const row = found(sourceRepository.getPlain(id), 'vpn source');
  providerOf(row);
  return row;
}

// accounts.credential -> the creds shape each provider's launch() expects
function launchCreds(p: VpnProvider, acc: Row): Creds {
  if (p.id === 'foxhole') {
    return {
      uid: acc.credential.uid ?? '',
      email: acc.email,
      sessionToken: acc.credential.session_token ?? '',
    };
  }
  return { ...acc.credential };
}

function parseCreds(text: string): Creds {
  try {
    const value = JSON.parse(text);
    return value && typeof value === 'object' ? (value as Creds) : {};
  } catch {
    return {};
  }
}

function fieldValues(p: VpnProvider, creds: Creds): string {
  return JSON.stringify(p.fields.map((f) => creds[f.key] ?? ''));
}

function cleanCreds(p: VpnProvider, input: unknown, previous: Creds): Creds {
  const src = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const out: Creds = { ...previous };
  for (const f of p.fields) {
    const raw = src[f.key];
    if (raw === undefined) continue;
    const value = String(raw ?? '').trim();
    if (value === '' && f.secret && previous[f.key]) continue;
    out[f.key] = value;
  }
  for (const f of p.fields)
    if (f.required && !out[f.key]) throw new AppError(`${f.label} is required`, 400);
  return out;
}

function view(row: Row) {
  const p = providerOf(row);
  const accounts = accountRepository.list(row.id);
  const creds = accounts[0] ? launchCreds(p, accounts[0]) : {};
  const inst = instances.get(row.id);
  return {
    id: row.id as string,
    provider: p.id,
    label: p.label,
    name: row.name as string,
    url: p.url,
    activated: accounts.length > 0,
    running: Boolean(inst),
    port: inst?.port ?? null,
    proxyId: inst?.proxyId ?? null,
    startedAt: inst ? new Date(inst.startedAt).toISOString() : null,
    logs: inst?.logs ?? [],
    config: Object.fromEntries(
      p.fields.filter((f) => !f.secret).map((f) => [f.key, creds[f.key] ?? '']),
    ),
    secretsSet: p.fields.filter((f) => f.secret && creds[f.key]).map((f) => f.key),
    accounts: accounts.map((a) => ({
      id: a.id as string,
      uid: (a.credential.uid ?? '') as string,
      email: a.email as string,
      profileId: (a.credential.profile_id ?? '') as string,
      profileDirectory: (a.credential.profile_directory ?? '') as string,
      createdAt: new Date(a.created_at).toISOString(),
    })),
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

function probe(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect(port, HOST);
    socket.setTimeout(1000, () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
  });
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, HOST, () => {
      const { port } = server.address() as net.AddressInfo;
      server.close(() => resolve(port));
    });
  });
}

async function waitReady(inst: Instance, timeoutMs: number): Promise<boolean> {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    if (inst.error || inst.child.exitCode !== null) return false;
    if (await probe(inst.port)) return true;
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

function collect(inst: Instance, stream: NodeJS.ReadableStream | null): void {
  stream?.on('data', (chunk: Buffer) => {
    for (const line of chunk.toString().split('\n')) {
      if (line.trim() === '') continue;
      inst.logs.push(line.trim());
      if (inst.logs.length > LOG_LINES) inst.logs.shift();
    }
  });
}

const extras = new Map<string, Instance[]>(); // ASSUMED: foxhole serves one country per process, so extra countries of an account run as extra processes next to the primary one
const EXTRA_BATCH = 5;
const SERVERLIST_URL =
  'https://firefox.settings.services.mozilla.com/v1/buckets/main/collections/vpn-serverlist/records';

async function freeCountries(): Promise<string[]> {
  const res = await fetch(SERVERLIST_URL, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new AppError(`server list fetch failed: HTTP ${res.status}`, 502);
  const body = (await res.json()) as {
    data?: {
      code?: string;
      locked?: boolean;
      cities?: { servers?: { quarantined?: boolean }[] }[];
    }[];
  };
  const out = new Set<string>();
  for (const c of body.data ?? []) {
    if (!c.code || c.code === 'REC' || c.locked) continue;
    if ((c.cities ?? []).some((city) => (city.servers ?? []).some((s) => !s.quarantined)))
      out.add(c.code.toUpperCase());
  }
  return [...out];
}

async function requestedCountries(raw: unknown, current: string | undefined): Promise<string[]> {
  let list: string[] = [];
  if (raw === 'all') list = await freeCountries();
  else if (Array.isArray(raw)) {
    list = raw.map((c) => String(c).trim().toUpperCase());
    if (list.some((c) => !/^[A-Z]{2}$/.test(c)))
      throw new AppError('countries must be 2-letter codes', 400);
  }
  const skip = (current ?? '').toUpperCase();
  return [...new Set(list)].filter((c) => c !== skip);
}

function spawnMember(
  id: string,
  row: Row,
  p: VpnProvider,
  dir: string,
  creds: Creds,
  port: number,
  primary: boolean,
): Instance {
  const launch = p.launch(dir, port, creds);
  const child = spawn(launch.command, launch.args, {
    cwd: dir,
    env: launch.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const inst: Instance = {
    child,
    port,
    proxyId: null,
    accountId: null,
    startedAt: Date.now(),
    logs: [],
    error: null,
    name: row.name as string,
    provider: p.id,
    country: creds.country ?? '',
    status: 'unchecked',
    latencyMs: null,
    exitIp: '',
    lastMessage: '',
    lastChecked: null,
  };
  if (primary) instances.set(id, inst);
  else extras.set(id, [...(extras.get(id) ?? []), inst]);
  collect(inst, child.stdout);
  collect(inst, child.stderr);
  child.on('error', (err) => {
    inst.error = err.message;
  });
  child.on('exit', (code) => {
    logger.info(`${p.label} "${row.name}" ${creds.country ?? ''} exited with code ${code}`);
    logger.info(
      `[DEBUG] ${p.label} last logs: ${inst.logs.slice(-10).join(' | ') || '(none)'} error=${inst.error ?? '-'}`,
    );
    const mine = instances.get(id) === inst;
    const extra = (extras.get(id) ?? []).includes(inst);
    if (mine) instances.delete(id);
    if (extra)
      extras.set(
        id,
        (extras.get(id) ?? []).filter((i) => i !== inst),
      );
  });
  return inst;
}

function register(inst: Instance, row: Row, primary = false): void {
  inst.proxyId = `vpn:${row.id}:${inst.port}`;
  inst.name = primary || !inst.country ? (row.name as string) : `${row.name} ${inst.country}`;
}

function liveEntries(): { sourceId: string; inst: Instance }[] {
  const ids = new Set([...instances.keys(), ...extras.keys()]);
  return [...ids].flatMap((sourceId) =>
    [instances.get(sourceId), ...(extras.get(sourceId) ?? [])]
      .filter((i): i is Instance => Boolean(i && i.proxyId))
      .map((inst) => ({ sourceId, inst })),
  );
}

type ProxyView = Pick<
  Instance,
  | 'proxyId'
  | 'name'
  | 'port'
  | 'provider'
  | 'country'
  | 'status'
  | 'latencyMs'
  | 'exitIp'
  | 'lastMessage'
  | 'lastChecked'
  | 'startedAt'
>;

function toProxy(sourceId: string, inst: ProxyView) {
  return mapProxy({
    id: inst.proxyId,
    source_id: sourceId,
    name: inst.name,
    host: HOST,
    port: inst.port,
    protocol: 'socks5',
    username: '',
    password: '',
    kind: 'datacenter',
    ownership: 'private',
    status: inst.status,
    provider: inst.provider,
    country: inst.country,
    city: '',
    isp: '',
    exit_ip: inst.exitIp,
    latency_ms: inst.latencyMs,
    success_rate: 0,
    latency_history: '[]',
    last_message: inst.lastMessage,
    quota_used_gb: 0,
    quota_total_gb: null,
    sticky_enabled: 0,
    sticky_ttl_min: 30,
    rotation_min: 0,
    max_conns: 10,
    tags: JSON.stringify(['vpn', inst.provider]),
    used_by: '[]',
    notes: '',
    created_at: inst.startedAt,
    last_checked: inst.lastChecked,
    expires_at: null,
  } as Row);
}

let legacyCleared = false;

// ASSUMED: vpn proxies saved in the proxies table by older versions are stale (dead after restart), so they are dropped once per run
function clearLegacyProxies(): void {
  if (legacyCleared) return;
  legacyCleared = true;
  for (const r of sourceRepository.list()) {
    if (r.type !== 'vpn' || !PROVIDERS.some((p) => p.id !== 'warp' && p.label === r.name)) continue;
    const old = proxyRepository.list(r.id).map((x) => x.id as string);
    if (old.length > 0) proxyRepository.removeMany(old);
  }
}

function killInstance(id: string): void {
  const all = [instances.get(id), ...(extras.get(id) ?? [])].filter((i): i is Instance =>
    Boolean(i),
  );
  instances.delete(id);
  extras.delete(id);
  for (const inst of all) inst.child.kill('SIGTERM');
}

function accountDir(id: string): string {
  const dir = path.join(getConfig().vpnDir, id);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export const vpnService = {
  providers: () =>
    PROVIDERS.map((p) => ({
      id: p.id,
      label: p.label,
      description: p.description,
      url: p.url,
      activation: p.activation,
      fields: p.fields,
    })),

  ensureDefaults: (): void => {
    for (const p of PROVIDERS) {
      if (p.id === 'warp' || sourceRepository.findVpn(p.label)) continue; // ASSUMED: WARP's source is the existing warp.service one (multi-device), so only foxhole and proton are seeded here
      sourceRepository.insert(newId(), { name: p.label, type: 'vpn' });
      logger.info(`Created source "${p.label}"`);
    }
  },

  list: () => {
    vpnService.ensureDefaults();
    clearLegacyProxies();
    return sourceRepository
      .list()
      .filter(
        (r) => r.type === 'vpn' && PROVIDERS.some((p) => p.id !== 'warp' && p.label === r.name),
      )
      .map(view);
  },

  get: (id: string) => view(requireAccount(id)),

  // only proxies that are actually running; accounts never appear as proxy rows
  proxies: (sourceId?: string) =>
    liveEntries()
      .filter((e) => !sourceId || e.sourceId === sourceId)
      .map((e) => toProxy(e.sourceId, e.inst)),

  proxy: (id: string) => {
    const hit = liveEntries().find((e) => e.inst.proxyId === id);
    return hit ? toProxy(hit.sourceId, hit.inst) : null;
  },

  testProxies: async (ids: string[]) => {
    const targets = liveEntries().filter((e) => ids.includes(e.inst.proxyId as string));
    await Promise.all(
      targets.map(async ({ inst }) => {
        const r = await probeProxy(
          { protocol: 'socks5', host: HOST, port: inst.port, username: '', password: '' },
          getConfig().checkTimeoutMs,
        );
        inst.status = r.ok ? 'healthy' : 'dead';
        inst.latencyMs = r.ok ? r.latencyMs : null;
        inst.exitIp = r.exitIp || inst.exitIp;
        inst.lastMessage = r.message;
        inst.lastChecked = Date.now();
      }),
    );
    return targets.map((e) => toProxy(e.sourceId, e.inst));
  },

  create: (input: Record<string, unknown>) => {
    const p = getProvider(input.provider);
    if (p.id === 'warp') throw new AppError('WARP devices are managed by the warp service', 400);
    const source = found(sourceRepository.findVpn(p.label), 'vpn source');
    const creds = cleanCreds(p, input.credentials, {});
    const email = typeof input.name === 'string' ? input.name.trim() : '';
    accountRepository.insert({ sourceId: source.id as string, email, credential: creds });
    return vpnService.get(source.id as string);
  },

  update: (id: string, input: Record<string, unknown>) => {
    const row = requireAccount(id);
    const p = providerOf(row);
    const accounts = accountRepository.list(id);
    const target =
      typeof input.accountId === 'string'
        ? accounts.find((a) => a.id === input.accountId)
        : accounts[0];
    if (!target) throw new AppError(`${row.name} has no account to update`, 404);
    const next = cleanCreds(p, input.credentials, target.credential);
    if (fieldValues(p, target.credential) !== fieldValues(p, next)) killInstance(id);
    accountRepository.update(target.id as string, {
      email: input.name !== undefined ? requireString(input.name, 'name').trim() : undefined,
      credential: next,
    });
    return vpnService.get(id);
  },

  remove: (id: string): void => {
    requireAccount(id);
    killInstance(id);
    accountRepository.removeBySource(id); // the vpn source itself is built in; removing it means clearing its accounts and proxies
    fs.rmSync(path.join(getConfig().vpnDir, id), { recursive: true, force: true });
  },

  activate: async (id: string, opts: Record<string, unknown> = {}) => {
    const row = requireAccount(id);
    const p = providerOf(row);
    const existing = accountRepository.list(id)[0];
    const creds = existing ? launchCreds(p, existing) : {};
    // ASSUMED: browser launch options (userDataDir/profileDirectory) reach activate via transient creds and are never persisted
    const runtime: Creds = {};
    if (typeof opts.userDataDir === 'string' && opts.userDataDir)
      runtime.userDataDir = opts.userDataDir;
    if (typeof opts.profileDirectory === 'string' && opts.profileDirectory)
      runtime.profileDirectory = opts.profileDirectory;
    const state = await p.activate(accountDir(id), { ...creds, ...runtime });
    if (p.id === 'foxhole' && state.uid) {
      accountRepository.upsert(newId(), {
        sourceId: id,
        email: state.email ?? '',
        credential: {
          uid: state.uid,
          session_token: state.sessionToken ?? '',
          profile_id: typeof opts.profileId === 'string' ? opts.profileId : '',
          user_data_dir: runtime.userDataDir ?? '',
          profile_directory: runtime.profileDirectory ?? '',
        },
      });
    }
    logger.info(`${p.label} "${row.name}" activated`);
    return vpnService.get(id);
  },

  start: async (id: string, opts: Record<string, unknown> = {}) => {
    const row = requireAccount(id);
    const p = providerOf(row);
    const accounts = accountRepository.list(id);
    const chosen =
      typeof opts.accountId === 'string'
        ? accounts.find((a) => a.id === opts.accountId)
        : accounts[0];
    if (!chosen) throw new AppError(`${row.name} has no account yet`, 409);
    if (instances.has(id)) throw new AppError(`${row.name} is already running`, 409);
    let port = await freePort();
    if (opts.port !== undefined && opts.port !== null && opts.port !== '') {
      port = Number(opts.port);
      if (!Number.isInteger(port) || port < 1024 || port > 65535)
        throw new AppError('port must be an integer between 1024 and 65535', 400);
    }
    const dir = accountDir(id);
    let creds = launchCreds(p, chosen);
    if (typeof opts.country === 'string' && p.fields.some((f) => f.key === 'country')) {
      const country = opts.country.trim().toUpperCase();
      if (country !== '' && !/^[A-Z]{2}$/.test(country))
        throw new AppError('country must be a 2-letter code', 400);
      creds = { ...creds, country };
    }
    const countries =
      p.id === 'foxhole' ? await requestedCountries(opts.countries, creds.country) : [];
    const inst = spawnMember(id, row, p, dir, creds, port, true);
    inst.accountId = chosen.id as string;

    if (!(await waitReady(inst, getConfig().vpnStartTimeoutMs))) {
      const reason = inst.error ?? inst.logs.slice(-3).join(' | ');
      killInstance(id);
      throw new AppError(`${p.label} failed to start: ${reason || 'timed out'}`, 502);
    }
    register(inst, row, true);
    logger.info(`${p.label} "${row.name}" ready on ${HOST}:${port}`);

    const startExtra = async (country: string): Promise<void> => {
      const extraPort = await freePort();
      const extra = spawnMember(id, row, p, dir, { ...creds, country }, extraPort, false);
      extra.accountId = chosen.id as string;
      if (!(await waitReady(extra, getConfig().vpnStartTimeoutMs))) {
        logger.warn(
          `${p.label} ${country} failed to start: ${extra.error ?? extra.logs.slice(-3).join(' | ') ?? 'timed out'}`,
        );
        extra.child.kill('SIGTERM');
        extras.set(
          id,
          (extras.get(id) ?? []).filter((i) => i !== extra),
        );
        return;
      }
      register(extra, row);
      logger.info(`${p.label} "${row.name}" ${country} ready on ${HOST}:${extraPort}`);
    };
    for (let i = 0; i < countries.length; i += EXTRA_BATCH) {
      await Promise.all(
        countries
          .slice(i, i + EXTRA_BATCH)
          .map((c) =>
            startExtra(c).catch((err) =>
              logger.warn(`${p.label} ${c}: ${err instanceof Error ? err.message : String(err)}`),
            ),
          ),
      );
    }
    return vpnService.get(id);
  },

  stop: (id: string) => {
    const row = requireAccount(id);
    if (!instances.has(id)) throw new AppError(`${row.name} is not running`, 409);
    killInstance(id);
    return vpnService.get(id);
  },

  stopAll: (): void => {
    for (const id of new Set([...instances.keys(), ...extras.keys()])) killInstance(id);
  },
};

process.once('exit', () => {
  for (const inst of [...instances.values(), ...[...extras.values()].flat()])
    inst.child.kill('SIGTERM');
});
