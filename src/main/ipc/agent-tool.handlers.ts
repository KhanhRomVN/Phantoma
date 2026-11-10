import { ipcMain } from 'electron';
import {
  AgentConfig,
  CatalogFailure,
  DiscoveryResult,
  Provider,
  MCPServer,
} from '../../shared/types/agent-tool';
import {
  listAgentSessions,
  listOpencodeSessions,
  loadAgentSessionMessages,
  loadOpencodeMessages,
} from './agent-tool-sessions';
import { probeClaude, probeCodex, probeOpencode } from './agent-tool-session-probe';
import { runClaude } from './agent-tool-run';
import { runOpencode, type OpencodeServer } from './agent-tool-opencode-run';
import { fetchPlanUsage } from './agent-tool-usage';
import type { AgentEvent, AgentKind, RunRequest } from '../../shared/types/agent-tool';
import { exec, spawn } from 'child_process';
import { randomUUID } from 'crypto';
import * as net from 'net';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';

const execAsync = promisify(exec);

// Store for permission callbacks
const permissionCallbacks = new Map<string, (approved: boolean) => void>();

/**
 * Discover available tools based on agent config
 * Tương tự Wu's provider_catalog và discovery mechanism
 */
const DISCOVERY_TIMEOUT_MS = 30000;
const CATALOG_TTL_MS = 60000;
const catalogCache = new Map<string, DiscoveryResult>();
const inflightDiscovery = new Map<string, Promise<DiscoveryResult>>();

function classifyFailure(error: unknown): CatalogFailure {
  const message = error instanceof Error ? error.message : String(error);
  if (/not logged in|authentication failed|HTTP 40[13]/i.test(message)) {
    return { code: 'auth_required', message };
  }
  if (/ENOENT|CLI not found/i.test(message)) return { code: 'missing_executable', message };
  if (/timed out|timeout/i.test(message)) return { code: 'timeout', message };
  return { code: 'failed', message };
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('operation timed out')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

// Cache theo từng agent config; chỉ lỗi tạm thời (timeout/failed) mới được trả stale
async function discoverTools(config: AgentConfig, force = false): Promise<DiscoveryResult> {
  const key = `${config.kind}|${config.executable ?? ''}|${config.baseUrl ?? ''}`;
  const cached = catalogCache.get(key);
  if (cached && !force && Date.now() - cached.timestamp < CATALOG_TTL_MS) return cached;

  const pending = inflightDiscovery.get(key);
  if (pending) return pending;

  const task = (async (): Promise<DiscoveryResult> => {
    try {
      const fresh = await withTimeout(discoverToolsUncached(config), DISCOVERY_TIMEOUT_MS);
      if (fresh.providers.some((p) => p.models.length > 0)) catalogCache.set(key, fresh);
      return fresh;
    } catch (error) {
      const failure = classifyFailure(error);
      const allowsStale = failure.code === 'timeout' || failure.code === 'failed';
      if (cached && allowsStale) return { ...cached, source: 'stale', error: failure };
      return {
        providers: [],
        mcpServers: [],
        timestamp: Date.now(),
        source: 'stale',
        error: failure,
      };
    } finally {
      inflightDiscovery.delete(key);
    }
  })();
  inflightDiscovery.set(key, task);
  return task;
}

async function discoverToolsUncached(config: AgentConfig): Promise<DiscoveryResult> {
  const result: DiscoveryResult = {
    providers: [],
    mcpServers: [],
    timestamp: Date.now(),
    source: 'fresh',
  };

  try {
    if (config.kind === 'claude') {
      await discoverClaude(result, config);
    } else if (config.kind === 'codex') {
      await discoverCodex(result, config);
    } else if (config.kind === 'opencode') {
      await discoverOpencode(result, config);
    }
  } catch (error) {
    console.error('Discovery error:', error);
    throw error;
  }

  return result;
}

/**
 * Discover Claude tools
 * Runs: claude agent config list-models
 */
async function discoverClaude(result: DiscoveryResult, config: AgentConfig): Promise<void> {
  const executable = config.executable || (await findClaudeExecutable());
  if (!executable) {
    throw new Error('Claude CLI not found');
  }

  try {
    const models = await discoverClaudeModels(executable);
    result.providers.push({ id: 'claude', name: 'Claude', connected: true, models });

    // Check for MCP servers in Claude config
    const mcpServers = await discoverClaudeMCPServers(config);
    result.mcpServers.push(...mcpServers);
  } catch (error) {
    console.error('Claude discovery failed:', error);
    throw error;
  }
}

type ModelInfo = Provider['models'][number];

// ASSUMED: danh sách tĩnh lấy từ wu (claude/catalog.rs, codex/catalog.rs)
const CLAUDE_STATIC_MODELS: Array<[string, string]> = [
  ['claude-fable-5-1', 'Fable 5.1'],
  ['claude-fable-5', 'Fable 5'],
  ['claude-opus-5-5', 'Opus 5.5'],
  ['claude-opus-4-8', 'Opus 4.8'],
  ['claude-opus-4-7', 'Opus 4.7'],
  ['claude-sonnet-5', 'Sonnet 5'],
  ['claude-haiku-4-5', 'Haiku 4.5'],
];

const CODEX_STATIC_MODELS: Array<[string, string]> = [
  ['gpt-6.1-sol', 'GPT-6.1-Sol'],
  ['gpt-6-astra', 'GPT-6-Astra'],
  ['gpt-6.1-terra', 'GPT-6.1 Terra'],
  ['gpt-6-sol', 'GPT-6-Sol'],
  ['gpt-6-luna', 'GPT-6-Luna'],
  ['gpt-5.6-sol', 'GPT-5.6-Sol'],
  ['gpt-5.6-terra', 'GPT-5.6-Terra'],
  ['gpt-5.6-luna', 'GPT-5.6-Luna'],
  ['gpt-daybreak-blue-latest', 'Daybreak Blue'],
  ['gpt-5.5', 'GPT-5.5'],
  ['gpt-5.4', 'GPT-5.4'],
  ['gpt-5.4-mini', 'GPT-5.4-Mini'],
  ['gpt-5.3-codex-spark', 'GPT-5.3-Codex-Spark'],
];

function toModels(entries: Array<[string, string]>, providerId: string): ModelInfo[] {
  return entries.map(([id, name]) => ({ id, name, provider: providerId }));
}

function splitContextSize(id: string): { base: string; size?: string } {
  const match = /^(.+)\[(\d+[km])\]$/i.exec(id);
  return match ? { base: match[1], size: match[2].toLowerCase() } : { base: id };
}

function contextTokens(size: string): number {
  const count = parseInt(size, 10);
  return size.endsWith('m') ? count * 1_000_000 : count * 1_000;
}

async function claudeConfiguredModels(): Promise<ModelInfo[]> {
  const models = toModels(CLAUDE_STATIC_MODELS, 'claude');
  const root = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
  try {
    const settings = JSON.parse(await fs.readFile(path.join(root, 'settings.json'), 'utf-8'));
    const keys = [
      'ANTHROPIC_MODEL',
      'ANTHROPIC_SMALL_FAST_MODEL',
      'ANTHROPIC_DEFAULT_OPUS_MODEL',
      'ANTHROPIC_DEFAULT_SONNET_MODEL',
      'ANTHROPIC_DEFAULT_HAIKU_MODEL',
    ];
    const ids = [settings.model, ...keys.map((key) => settings.env?.[key])];
    for (const raw of ids) {
      const id = typeof raw === 'string' ? raw.trim() : '';
      if (id && !models.some((m) => m.id === id)) {
        models.push({ id, name: id, provider: 'claude' });
      }
    }
  } catch {
    // settings.json không tồn tại hoặc không hợp lệ
  }
  return models;
}

const CLAUDE_PROBE_ID = 'phantoma-initialize-probe';

function probeClaudeInitialize(executable: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      executable,
      ['--print', '--input-format', 'stream-json', '--output-format', 'stream-json', '--verbose'],
      { cwd: os.tmpdir(), stdio: ['pipe', 'pipe', 'ignore'] },
    );
    let buffer = '';
    let settled = false;
    const finish = (error: Error | null, value?: any): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.kill();
      if (error) reject(error);
      else resolve(value);
    };
    const timer = setTimeout(() => finish(new Error('operation timed out')), 9000);
    child.on('error', (error) => finish(error));
    child.on('exit', () =>
      finish(new Error('claude exited before answering the initialize control request')),
    );
    child.stdout.on('data', (chunk) => {
      buffer += chunk.toString();
      let index = buffer.indexOf('\n');
      while (index >= 0) {
        const line = buffer.slice(0, index);
        buffer = buffer.slice(index + 1);
        index = buffer.indexOf('\n');
        let frame: any;
        try {
          frame = JSON.parse(line);
        } catch {
          continue;
        }
        if (frame?.type !== 'control_response') continue;
        const response = frame.response;
        if (response?.request_id !== CLAUDE_PROBE_ID) continue;
        if (response.subtype === 'error') {
          finish(new Error(response.error || 'initialize control request failed'));
        } else {
          finish(null, response);
        }
        return;
      }
    });
    child.stdin.write(
      JSON.stringify({
        type: 'control_request',
        request_id: CLAUDE_PROBE_ID,
        request: { subtype: 'initialize' },
      }) + '\n',
    );
  });
}

async function discoverClaudeModels(executable: string): Promise<ModelInfo[]> {
  const models = await claudeConfiguredModels();
  let init: any;
  try {
    init = await probeClaudeInitialize(executable);
  } catch (error) {
    console.error('[DEBUG] claude initialize probe failed, dùng danh sách tĩnh:', error);
    return models;
  }
  const entries: any[] = Array.isArray(init?.response?.models) ? init.response.models : [];
  let defaultId: string | undefined;
  for (const entry of entries) {
    const text = (key: string): string =>
      typeof entry?.[key] === 'string' ? entry[key].trim() : '';
    const full = text('resolvedModel') || text('value');
    if (!full) continue;
    const { base, size } = splitContextSize(full);
    const resolvedSize = size ?? splitContextSize(text('value')).size;
    if (['default', 'opus', 'sonnet', 'haiku', 'fable'].includes(base)) continue;
    if (text('value') === 'default') defaultId = base;
    let model = models.find((m) => m.id === base);
    if (!model) {
      model = {
        id: base,
        name: text('displayName') || base,
        provider: 'claude',
        variants: Array.isArray(entry.supportedEffortLevels) ? entry.supportedEffortLevels : [],
      };
      models.push(model);
    }
    if (resolvedSize) {
      const tokens = contextTokens(resolvedSize);
      if (tokens > (model.contextWindow ?? 0)) model.contextWindow = tokens;
    }
  }
  if (defaultId) {
    const index = models.findIndex((m) => m.id === defaultId);
    if (index > 0) models.unshift(...models.splice(index, 1));
  }
  return models;
}

/**
 * Discover Claude MCP servers from config
 */
async function discoverClaudeMCPServers(config: AgentConfig): Promise<MCPServer[]> {
  const servers: MCPServer[] = [];

  try {
    const configDir = config.executable
      ? path.dirname(config.executable)
      : path.join(os.homedir(), '.claude');

    const mcpConfigPath = path.join(configDir, 'mcp.json');

    try {
      const mcpConfigContent = await fs.readFile(mcpConfigPath, 'utf-8');
      const mcpConfig = JSON.parse(mcpConfigContent);

      if (mcpConfig.servers) {
        for (const [serverId, serverConfig] of Object.entries(
          mcpConfig.servers as Record<string, any>,
        )) {
          servers.push({
            id: serverId,
            name: serverConfig.name || serverId,
            connected: serverConfig.enabled !== false,
            tools: serverConfig.tools || [],
          });
        }
      }
    } catch (error) {
      // MCP config file doesn't exist or invalid - not an error
    }
  } catch (error) {
    console.error('Error discovering Claude MCP servers:', error);
  }

  return servers;
}

/**
 * Discover Codex tools
 */
async function discoverCodex(result: DiscoveryResult, config: AgentConfig): Promise<void> {
  result.providers.push({
    id: 'codex',
    name: 'Codex',
    connected: true,
    models: toModels(CODEX_STATIC_MODELS, 'codex').map((m) => ({
      ...m,
      variants: ['low', 'medium', 'high', 'xhigh'], // ASSUMED: mức reasoning của Codex là tĩnh
    })),
  });
}

const OPENCODE_USERNAME = 'opencode';

async function findOpencodeExecutable(): Promise<string> {
  const candidates = [
    path.join(os.homedir(), '.opencode', 'bin', 'opencode'),
    path.join(os.homedir(), '.local', 'bin', 'opencode'),
    '/opt/homebrew/bin/opencode',
    '/usr/local/bin/opencode',
  ];
  for (const candidate of candidates) {
    try {
      await fs.access(candidate, fs.constants.X_OK);
      return candidate;
    } catch {
      continue;
    }
  }
  return 'opencode';
}

function freeLocalhostPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      server.close(() =>
        port ? resolve(port) : reject(new Error('no free localhost port for opencode serve')),
      );
    });
  });
}

async function detectOpencodeProtocol(base: string, auth?: string): Promise<'v1' | 'v2' | null> {
  const routes: Array<[string, 'v1' | 'v2']> = [
    ['/api/info', 'v2'],
    ['/api/status', 'v2'],
    ['/api/health', 'v2'],
    ['/global/health', 'v1'],
  ];
  for (const [route, protocol] of routes) {
    const response = await fetch(`${base}${route}`, {
      headers: auth ? { Authorization: auth } : {},
      signal: AbortSignal.timeout(2000),
    }).catch(() => null);
    if (!response) continue;
    if (response.status === 401 || response.status === 403) {
      throw new Error(`opencode authentication rejected at ${route}: ${response.status}`);
    }
    if (!response.ok) continue;
    const body: any = await response.json().catch(() => null);
    if (typeof body?.version === 'string' && body.version.trim()) return protocol;
  }
  return null;
}

async function opencodeJson(base: string, auth: string | undefined, route: string): Promise<any> {
  const response = await fetch(`${base}${route}`, {
    headers: auth ? { Authorization: auth } : {},
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} at ${route}`);
  return response.json();
}

function catalogFromV2Models(models: any[]): { all: any[] } {
  const grouped = new Map<string, any>();
  for (const model of models) {
    if (model?.enabled === false || !model?.providerID || !model?.id) continue;
    let provider = grouped.get(model.providerID);
    if (!provider) {
      provider = { id: model.providerID, name: model.providerID, models: {} };
      grouped.set(model.providerID, provider);
    }
    provider.models[model.id] = {
      name: model.name,
      limit: model.limit,
      variants: Object.fromEntries((model.variants ?? []).map((v: any) => [v.id, true])),
    };
  }
  return { all: [...grouped.values()] };
}

/**
 * Discover Opencode tools
 * Giống wu: spawn `opencode serve` trên cổng trống, detect protocol, lấy catalog rồi tắt server
 */
async function discoverOpencode(result: DiscoveryResult, config: AgentConfig): Promise<void> {
  let child: ReturnType<typeof spawn> | null = null;

  try {
    let base = config.baseUrl;
    let auth: string | undefined;
    let protocol: 'v1' | 'v2' | null;

    if (base) {
      protocol = (await detectOpencodeProtocol(base)) ?? 'v1';
    } else {
      const executable = config.executable || (await findOpencodeExecutable());
      const port = await freeLocalhostPort();
      const password = randomUUID();
      const state = { exited: false, error: null as Error | null, stderr: '' };
      child = spawn(executable, ['serve', '--port', String(port), '--hostname', '127.0.0.1'], {
        cwd: os.tmpdir(),
        env: {
          ...process.env,
          OPENCODE_PASSWORD: password,
          OPENCODE_SERVER_PASSWORD: password,
          OPENCODE_SERVER_USERNAME: OPENCODE_USERNAME,
          OPENCODE_CLIENT: 'phantoma',
        },
        stdio: ['ignore', 'ignore', 'pipe'],
      });
      child.stderr?.on('data', (chunk) => {
        state.stderr = (state.stderr + chunk.toString()).slice(-2000);
      });
      child.on('error', (error) => {
        state.error = error;
      });
      child.on('exit', () => {
        state.exited = true;
      });
      base = `http://127.0.0.1:${port}`;
      auth = `Basic ${Buffer.from(`${OPENCODE_USERNAME}:${password}`).toString('base64')}`;

      const deadline = Date.now() + 20000;
      protocol = null;
      while (!protocol) {
        if (state.error) throw state.error;
        if (state.exited) throw new Error(`opencode serve exited: ${state.stderr.trim()}`);
        protocol = await detectOpencodeProtocol(base, auth);
        if (protocol) break;
        if (Date.now() >= deadline) {
          throw new Error('opencode serve did not become healthy within 20s');
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }

    let data: any;
    if (protocol === 'v2') {
      let list: any[] = [];
      for (let attempt = 1; attempt <= 5; attempt++) {
        const body = await opencodeJson(base, auth, '/api/model');
        list = Array.isArray(body?.data) ? body.data : Array.isArray(body) ? body : [];
        if (list.length > 0) break;
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
      data = catalogFromV2Models(list);
    } else {
      data = await opencodeJson(base, auth, '/provider');
    }

    // ASSUMED: danh sách agent lấy từ /agent (v1) hoặc /api/agent (v2), bỏ subagent và agent ẩn
    const agentBody = await opencodeJson(
      base,
      auth,
      protocol === 'v2' ? '/api/agent' : '/agent',
    ).catch(() => null);
    const agentItems: any[] = Array.isArray(agentBody)
      ? agentBody
      : Array.isArray(agentBody?.data)
        ? agentBody.data
        : [];
    result.agents = agentItems
      .filter((a) => a?.name && a.mode !== 'subagent' && !a.hidden)
      .map((a) => String(a.name));

    // Parse provider catalog (tương tự Wu's ProviderCatalog)
    if (data.all) {
      const connectedSet = new Set(data.connected || []);

      for (const provider of data.all) {
        if (!provider.id) continue;

        const isConnected = connectedSet.size === 0 || connectedSet.has(provider.id);
        if (!isConnected) continue;

        const models = [];
        if (provider.models) {
          for (const [modelId, modelData] of Object.entries(
            provider.models as Record<string, any>,
          )) {
            models.push({
              id: `${provider.id}/${modelId}`,
              name: modelData.name || modelId,
              provider: provider.name || provider.id,
              contextWindow: modelData.limit?.context,
              variants: modelData.variants ? Object.keys(modelData.variants) : [],
            });
          }
        }

        result.providers.push({
          id: provider.id,
          name: provider.name || provider.id,
          connected: isConnected,
          models,
        });
      }
    }
  } catch (error) {
    console.error('Opencode discovery failed:', error);
    throw error;
  } finally {
    child?.kill();
  }
}

async function startOpencodeServer(request: RunRequest): Promise<OpencodeServer> {
  if (request.baseUrl) {
    const protocol = (await detectOpencodeProtocol(request.baseUrl)) ?? 'v1';
    return { base: request.baseUrl, protocol, stop: () => {} };
  }

  const executable = request.executable || (await findOpencodeExecutable());
  const port = await freeLocalhostPort();
  const password = randomUUID();
  const state = { exited: false, error: null as Error | null, stderr: '' };
  const child = spawn(executable, ['serve', '--port', String(port), '--hostname', '127.0.0.1'], {
    cwd: request.cwd || os.homedir(),
    env: {
      ...process.env,
      OPENCODE_PASSWORD: password,
      OPENCODE_SERVER_PASSWORD: password,
      OPENCODE_SERVER_USERNAME: OPENCODE_USERNAME,
      OPENCODE_CLIENT: 'phantoma',
    },
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  child.stderr?.on('data', (chunk) => {
    state.stderr = (state.stderr + chunk.toString()).slice(-2000);
  });
  child.on('error', (error) => {
    state.error = error;
  });
  child.on('exit', () => {
    state.exited = true;
  });
  const base = `http://127.0.0.1:${port}`;
  const auth = `Basic ${Buffer.from(`${OPENCODE_USERNAME}:${password}`).toString('base64')}`;

  try {
    const deadline = Date.now() + 20000;
    while (!(await detectOpencodeProtocol(base, auth))) {
      if (state.error) throw state.error;
      if (state.exited) throw new Error(`opencode serve exited: ${state.stderr.trim()}`);
      if (Date.now() >= deadline) {
        throw new Error('opencode serve did not become healthy within 20s');
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  } catch (error) {
    child.kill();
    throw error;
  }
  const protocol = (await detectOpencodeProtocol(base, auth)) ?? 'v1';
  return { base, auth, protocol, stop: () => child.kill() };
}

/**
 * Find Claude executable on system
 */
async function findClaudeExecutable(): Promise<string | null> {
  const candidates = [
    path.join(os.homedir(), '.claude', 'local', 'claude'),
    path.join(os.homedir(), '.local', 'bin', 'claude'),
    '/opt/homebrew/bin/claude',
    '/usr/local/bin/claude',
    'claude', // In PATH
  ];

  for (const candidate of candidates) {
    try {
      // Check if file exists and is executable
      await fs.access(candidate, fs.constants.X_OK);
      return candidate;
    } catch (error) {
      // Continue to next candidate
    }
  }

  return null;
}

/**
 * Request permission from user for tool execution
 */
function requestPermission(id: string, question: string, options: string[]): Promise<boolean> {
  return new Promise((resolve) => {
    // Store callback
    permissionCallbacks.set(id, resolve);

    // Send to renderer
    const allWindows = require('electron').BrowserWindow.getAllWindows();
    for (const window of allWindows) {
      window.webContents.send('agent-tool:permission-request', {
        id,
        question,
        options,
      });
    }

    // Timeout after 5 minutes
    setTimeout(
      () => {
        if (permissionCallbacks.has(id)) {
          permissionCallbacks.delete(id);
          resolve(false); // Deny by default
        }
      },
      5 * 60 * 1000,
    );
  });
}

/**
 * Register IPC handlers
 */
export function registerAgentToolHandlers() {
  // Discovery
  ipcMain.handle('agent-tool:discover', async (_event, config: AgentConfig) => {
    const result = await discoverTools(config);
    return result;
  });

  ipcMain.handle('agent-tool:list-sessions', async (_event, config: AgentConfig) => {
    if (config.kind === 'opencode') {
      const server = await startOpencodeServer({
        executable: config.executable,
        baseUrl: config.baseUrl,
        cwd: os.homedir(),
      } as RunRequest);
      try {
        return await listOpencodeSessions(server);
      } finally {
        server.stop();
      }
    }
    const sessions = await listAgentSessions(config);
    return sessions;
  });

  ipcMain.handle(
    'agent-tool:load-session',
    async (_event, config: AgentConfig, sessionId: string) => {
      let messages;
      if (config.kind === 'opencode') {
        const server = await startOpencodeServer({
          executable: config.executable,
          baseUrl: config.baseUrl,
          cwd: os.homedir(),
        } as RunRequest);
        try {
          messages = await loadOpencodeMessages(server, sessionId);
        } finally {
          server.stop();
        }
      } else {
        messages = await loadAgentSessionMessages(config, sessionId);
      }
      return messages;
    },
  );

  ipcMain.handle('agent-tool:probe-sessions', async () => {
    const result: Record<string, unknown> = {};
    result.claude = await probeClaude().catch((error) => {
      console.error('[DEBUG][probe] claude failed', error);
      return String(error);
    });
    result.codex = await probeCodex().catch((error) => {
      console.error('[DEBUG][probe] codex failed', error);
      return String(error);
    });
    try {
      const server = await startOpencodeServer({ cwd: os.homedir() } as RunRequest);
      try {
        result.opencode = await probeOpencode(server);
      } finally {
        server.stop();
      }
    } catch (error) {
      console.error('[DEBUG][probe] opencode failed', error);
      result.opencode = String(error);
    }
    return result;
  });

  const activeRuns = new Map<string, () => void>();

  ipcMain.handle('agent-tool:run', async (event, request: RunRequest) => {
    const send = (payload: AgentEvent): void => {
      if (!event.sender.isDestroyed()) {
        event.sender.send('agent-tool:event', { runId: request.runId, event: payload });
      }
    };
    if (request.kind === 'opencode') {
      void runOpencode(request, {
        emit: send,
        askPermission: (question, options) => requestPermission(randomUUID(), question, options),
        onInterrupt: (handler) => activeRuns.set(request.runId, handler),
        startServer: () => startOpencodeServer(request),
      }).finally(() => activeRuns.delete(request.runId));
      return { ok: true };
    }
    if (request.kind !== 'claude') {
      send({ type: 'error', message: 'Agent ' + request.kind + ' chưa được hỗ trợ chạy' });
      send({ type: 'done', status: 'errored' });
      return { ok: false };
    }
    const executable = request.executable || (await findClaudeExecutable());
    if (!executable) {
      send({ type: 'error', message: 'Claude CLI not found' });
      send({ type: 'done', status: 'errored' });
      return { ok: false };
    }
    void runClaude(request, executable, {
      emit: send,
      askPermission: (question, options) => requestPermission(randomUUID(), question, options),
      onInterrupt: (handler) => activeRuns.set(request.runId, handler),
    }).finally(() => activeRuns.delete(request.runId));
    return { ok: true };
  });

  ipcMain.handle('agent-tool:plan-usage', (_event, kind: AgentKind) => fetchPlanUsage(kind));

  ipcMain.handle('agent-tool:interrupt', (_event, runId: string) => {
    activeRuns.get(runId)?.();
  });

  // Permission resolution
  ipcMain.handle('agent-tool:resolve-permission', (_event, id: string, approved: boolean) => {
    const callback = permissionCallbacks.get(id);
    if (callback) {
      permissionCallbacks.delete(id);
      callback(approved);
    }
  });

  // Request permission (called by agent harness)
  ipcMain.handle(
    'agent-tool:request-permission',
    async (_event, id: string, question: string, options: string[]) => {
      return await requestPermission(id, question, options);
    },
  );
}
