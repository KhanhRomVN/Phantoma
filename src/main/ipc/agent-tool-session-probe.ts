import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import type { OpencodeServer } from './agent-tool-opencode-run';

const TAG = '[DEBUG][probe]';
const MAX_BYTES = 5 * 1024 * 1024;
const TIMEOUT_MS = 10000;

function short(value: unknown, limit = 1200): string {
  let text: string;
  try {
    text = JSON.stringify(value);
  } catch {
    text = String(value);
  }
  return text && text.length > limit ? `${text.slice(0, limit)}…` : String(text);
}

function parseLines(text: string): any[] {
  const out: any[] = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try {
      out.push(JSON.parse(line));
    } catch {
      continue;
    }
  }
  return out;
}

async function readText(file: string): Promise<string> {
  const handle = await fs.open(file, 'r');
  try {
    const { size } = await handle.stat();
    const length = Math.min(size, MAX_BYTES);
    const buffer = Buffer.alloc(length);
    await handle.read(buffer, 0, length, 0);
    return buffer.toString('utf-8');
  } finally {
    await handle.close();
  }
}

async function newestFile(root: string, match: (name: string) => boolean): Promise<string | null> {
  const state = { file: null as string | null, mtime: 0 };
  const walk = async (dir: string, depth: number): Promise<void> => {
    let entries: import('fs').Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (depth < 4) await walk(full, depth + 1);
        continue;
      }
      if (!match(entry.name)) continue;
      const stat = await fs.stat(full).catch(() => null);
      if (stat && stat.mtimeMs > state.mtime) {
        state.file = full;
        state.mtime = stat.mtimeMs;
      }
    }
  };
  await walk(root, 0);
  return state.file;
}

export async function probeClaude(): Promise<unknown> {
  const root = path.join(
    process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'),
    'projects',
  );
  const file = await newestFile(root, (name) => name.endsWith('.jsonl'));
  if (!file) {
    return null;
  }
  const records = parseLines(await readText(file));
  const types: Record<string, number> = {};
  const models = new Set<string>();
  const tokensById = new Map<string, number>();
  let userMessages = 0;
  let sample: unknown = null;
  for (const r of records) {
    const type = String(r?.type ?? 'unknown');
    types[type] = (types[type] ?? 0) + 1;
    if (type === 'user' && r.isSidechain !== true) userMessages++;
    if (type !== 'assistant') continue;
    const usage = r.message?.usage;
    sample ??= { messageKeys: Object.keys(r.message ?? {}), usage };
    if (typeof r.message?.model === 'string') models.add(r.message.model);
    tokensById.set(
      r.message?.id ?? r.uuid,
      (usage?.input_tokens ?? 0) + (usage?.output_tokens ?? 0),
    );
  }
  let totalTokens = 0;
  for (const t of tokensById.values()) totalTokens += t;
  const result = {
    file,
    records: records.length,
    types,
    userRecords: userMessages,
    assistantMessages: tokensById.size,
    totalTokens,
    models: [...models],
    sample,
  };
  return result;
}

function codexRpc(): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    const child = spawn(process.env.CODEX_EXECUTABLE || 'codex', ['app-server'], {
      cwd: os.tmpdir(),
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    const log: Record<string, unknown> = {};
    let buffer = '';
    const done = (): void => {
      clearTimeout(timer);
      child.kill();
      resolve(log);
    };
    const timer = setTimeout(() => {
      log.timeout = true;
      done();
    }, TIMEOUT_MS);
    const send = (message: object): void => {
      child.stdin.write(JSON.stringify(message) + '\n');
    };
    child.stdin.on('error', () => undefined);
    child.on('error', (error) => {
      log.error = String(error);
      done();
    });
    child.stdout.on('data', (chunk) => {
      buffer += chunk.toString();
      let index = buffer.indexOf('\n');
      while (index >= 0) {
        const line = buffer.slice(0, index);
        buffer = buffer.slice(index + 1);
        index = buffer.indexOf('\n');
        let message: any;
        try {
          message = JSON.parse(line);
        } catch {
          continue;
        }
        if (message.id === 1) {
          send({ method: 'initialized' });
          send({
            id: 2,
            method: 'thread/list',
            params: {
              sortKey: 'updated_at',
              limit: 1,
              sourceKinds: ['cli', 'vscode', 'exec', 'appServer', 'unknown'],
            },
          });
        } else if (message.id === 2) {
          const thread = message.result?.data?.[0];
          log.threadListItem = thread ?? message.error ?? message.result;
          if (!thread?.id) return done();
          send({
            id: 3,
            method: 'thread/read',
            params: { threadId: thread.id, includeTurns: true },
          });
        } else if (message.id === 3) {
          log.threadRead = message.error ?? message.result;
          return done();
        }
      }
    });
    send({
      id: 1,
      method: 'initialize',
      params: {
        clientInfo: { name: 'phantoma', title: 'Phantoma', version: '1.0.0' },
        capabilities: { experimentalApi: true },
      },
    });
  });
}

export async function probeCodex(): Promise<unknown> {
  const root = path.join(process.env.CODEX_HOME || path.join(os.homedir(), '.codex'), 'sessions');
  const file = await newestFile(
    root,
    (name) => name.startsWith('rollout-') && name.endsWith('.jsonl'),
  );
  let rollout: unknown = null;
  if (file) {
    const records = parseLines(await readText(file));
    const types: Record<string, number> = {};
    const models = new Set<string>();
    const roles: Record<string, number> = {};
    let lastTokenUsage: unknown = null;
    for (const r of records) {
      const key = `${r?.type}/${r?.payload?.type ?? '-'}`;
      types[key] = (types[key] ?? 0) + 1;
      if (r?.type === 'turn_context' && typeof r.payload?.model === 'string') {
        models.add(r.payload.model);
      }
      if (r?.type === 'response_item' && r.payload?.type === 'message') {
        const role = String(r.payload.role ?? 'unknown');
        roles[role] = (roles[role] ?? 0) + 1;
      }
      if (r?.type === 'event_msg' && r.payload?.type === 'token_count' && r.payload.info) {
        lastTokenUsage = r.payload.info.total_token_usage ?? r.payload.info;
      }
    }
    rollout = { file, records: records.length, types, roles, models: [...models], lastTokenUsage };
  }
  const rpc = await codexRpc();
  return { rollout, rpc };
}

export async function probeOpencode(server: OpencodeServer): Promise<unknown> {
  const headers: Record<string, string> = server.auth ? { Authorization: server.auth } : {};
  const get = async (route: string): Promise<{ status: number; body: any }> => {
    const response = await fetch(server.base + route, {
      headers,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const body = await response.json().catch(() => null);
    return { status: response.status, body };
  };
  const asList = (body: any): any[] | null =>
    Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : null;

  const listRoute = server.protocol === 'v2' ? '/api/session?limit=5' : '/session';
  const list = await get(listRoute);
  const first = (asList(list.body) ?? []).find(
    (item) => typeof item?.id === 'string' && !item.parentID,
  );
  if (!first) return null;

  const prefix = server.protocol === 'v2' ? '/api/session/' : '/session/';
  const out: Record<string, unknown> = {};
  for (const route of [`${prefix}${first.id}/message`, `${prefix}${first.id}`]) {
    try {
      const r = await get(route);
      const items = asList(r.body);
      out[route] = { status: r.status, count: items?.length ?? null };
    } catch (error) {
      out[route] = { error: String(error) };
    }
  }
  return out;
}
