import { spawn } from 'child_process';
import type { Dirent } from 'fs';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import type { AgentConfig } from '../../shared/types/agent-tool';
import type { OpencodeServer } from './agent-tool-opencode-run';

export interface AgentSession {
  id: string;
  title: string;
  updatedAt: number;
  messageCount?: number;
  totalTokens?: number;
  modelId?: string;
}

function claudeStats(records: any[]): {
  messageCount: number;
  totalTokens: number;
  modelId?: string;
} {
  let messageCount = 0;
  let modelId: string | undefined;
  const tokensByMessage = new Map<string, number>();
  for (const r of records) {
    if (r?.isSidechain === true) continue;
    if (r?.type === 'user') {
      if (userText(r)) messageCount++;
    } else if (r?.type === 'assistant') {
      const id = typeof r.message?.id === 'string' ? r.message.id : r.uuid;
      const usage = r.message?.usage;
      const tokens = (usage?.input_tokens ?? 0) + (usage?.output_tokens ?? 0);
      if (id && !tokensByMessage.has(id)) messageCount++;
      if (id) tokensByMessage.set(id, tokens);
      const model = r.message?.model;
      if (typeof model === 'string' && model !== '<synthetic>') modelId = model;
    }
  }
  let totalTokens = 0;
  for (const t of tokensByMessage.values()) totalTokens += t;
  return { messageCount, totalTokens, modelId };
}

const TITLE_LIMIT = 120;
const MAX_SESSIONS = 50;
const MAX_READ_BYTES = 5 * 1024 * 1024;
const CODEX_TIMEOUT_MS = 10000;
const OPENCODE_TIMEOUT_MS = 10000;

function clipTitle(text: string): string {
  const line =
    text
      .split('\n')
      .map((l) => l.trim())
      .find(Boolean) ?? '';
  return line.length > TITLE_LIMIT ? `${line.slice(0, TITLE_LIMIT)}…` : line;
}

// ASSUMED: text bắt đầu bằng '<' là tag CLI tự thêm (command, caveat...), không phải người dùng gõ
function userText(record: any): string | null {
  const content = record?.message?.content;
  const text =
    typeof content === 'string'
      ? content
      : Array.isArray(content)
        ? content
            .filter((p: any) => p?.type === 'text' && typeof p.text === 'string')
            .map((p: any) => p.text)
            .join('\n')
        : '';
  const trimmed = text.trim();
  return trimmed && !trimmed.startsWith('<') ? trimmed : null;
}

function claudeTitle(records: any[]): string | null {
  const first = records
    .filter((r) => r?.type === 'user' && r.isSidechain !== true)
    .map(userText)
    .find(Boolean);
  if (!first) return null;
  const last = (kind: string, key: string): string | null => {
    for (let i = records.length - 1; i >= 0; i--) {
      const r = records[i];
      if (r?.type === kind && typeof r[key] === 'string' && r[key].trim()) return clipTitle(r[key]);
    }
    return null;
  };
  return (
    last('custom-title', 'customTitle') ??
    last('ai-title', 'aiTitle') ??
    last('summary', 'summary') ??
    clipTitle(first)
  );
}

// 5MB đầu file là đủ để lấy title, tránh đọc cả transcript lớn
async function readHead(file: string): Promise<string> {
  const handle = await fs.open(file, 'r');
  try {
    const { size } = await handle.stat();
    const length = Math.min(size, MAX_READ_BYTES);
    const buffer = Buffer.alloc(length);
    await handle.read(buffer, 0, length, 0);
    return buffer.toString('utf-8');
  } finally {
    await handle.close();
  }
}

// Claude Code tự lưu transcript ở <config>/projects/<cwd-mã-hóa>/<sessionId>.jsonl
async function listClaudeSessions(): Promise<AgentSession[]> {
  const root = path.join(
    process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'),
    'projects',
  );
  const files: Array<{ file: string; id: string; mtime: number }> = [];
  let dirs: string[];
  try {
    dirs = await fs.readdir(root);
  } catch {
    return [];
  }
  for (const dir of dirs) {
    let names: string[];
    try {
      names = await fs.readdir(path.join(root, dir));
    } catch {
      continue;
    }
    for (const name of names) {
      if (!name.endsWith('.jsonl')) continue;
      const file = path.join(root, dir, name);
      try {
        const stat = await fs.stat(file);
        files.push({
          file,
          id: name.slice(0, -'.jsonl'.length),
          mtime: Math.floor(stat.mtimeMs / 1000),
        });
      } catch {
        continue;
      }
    }
  }
  files.sort((a, b) => b.mtime - a.mtime);

  const sessions: AgentSession[] = [];
  for (const { file, id, mtime } of files) {
    if (sessions.length >= MAX_SESSIONS) break;
    try {
      const records: any[] = [];
      for (const line of (await readHead(file)).split('\n')) {
        if (!line.trim()) continue;
        try {
          records.push(JSON.parse(line));
        } catch {
          continue;
        }
      }
      const title = claudeTitle(records);
      if (title) sessions.push({ id, title, updatedAt: mtime * 1000, ...claudeStats(records) });
    } catch {
      continue;
    }
  }
  return sessions;
}

const CODEX_FULL_SCAN_BYTES = 8 * 1024 * 1024;
const CODEX_TAIL_BYTES = 512 * 1024;

// Codex lưu mỗi thread ở <CODEX_HOME>/sessions/YYYY/MM/DD/rollout-<time>-<threadId>.jsonl
async function indexCodexRollouts(): Promise<Map<string, string>> {
  const root = path.join(process.env.CODEX_HOME || path.join(os.homedir(), '.codex'), 'sessions');
  const map = new Map<string, string>();
  const walk = async (dir: string, depth: number): Promise<void> => {
    let entries: Dirent[];
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
      const match = entry.name.match(/^rollout-.*-([0-9a-f-]{36})\.jsonl$/);
      if (match) map.set(match[1], full);
    }
  };
  await walk(root, 0);
  return map;
}

// ASSUMED: msg = response_item message của user/assistant; token = input không cache + output; file > 8MB chỉ đọc phần đuôi (bỏ msg)
async function codexRolloutStats(
  file: string,
): Promise<Pick<AgentSession, 'messageCount' | 'totalTokens' | 'modelId'>> {
  const { size } = await fs.stat(file);
  const whole = size <= CODEX_FULL_SCAN_BYTES;
  let text: string;
  if (whole) {
    text = await fs.readFile(file, 'utf8');
  } else {
    const handle = await fs.open(file, 'r');
    try {
      const buffer = Buffer.alloc(CODEX_TAIL_BYTES);
      await handle.read(buffer, 0, CODEX_TAIL_BYTES, size - CODEX_TAIL_BYTES);
      text = buffer.toString('utf8');
      text = text.slice(text.indexOf('\n') + 1);
    } finally {
      await handle.close();
    }
  }
  let messageCount = 0;
  let totalTokens: number | undefined;
  let modelId: string | undefined;
  for (const line of text.split('\n')) {
    if (
      !line.includes('"turn_context"') &&
      !line.includes('"message"') &&
      !line.includes('"token_count"')
    ) {
      continue;
    }
    let record: any;
    try {
      record = JSON.parse(line);
    } catch {
      continue;
    }
    const payload = record?.payload;
    if (record?.type === 'turn_context' && typeof payload?.model === 'string') {
      modelId = payload.model;
    } else if (
      record?.type === 'response_item' &&
      payload?.type === 'message' &&
      (payload.role === 'user' || payload.role === 'assistant')
    ) {
      messageCount++;
    } else if (
      record?.type === 'event_msg' &&
      payload?.type === 'token_count' &&
      payload.info?.total_token_usage
    ) {
      const usage = payload.info.total_token_usage;
      totalTokens =
        Math.max(0, Number(usage.input_tokens ?? 0) - Number(usage.cached_input_tokens ?? 0)) +
        Number(usage.output_tokens ?? 0);
    }
  }
  return { messageCount: whole ? messageCount : undefined, totalTokens, modelId };
}

async function enrichCodexSessions(sessions: AgentSession[]): Promise<AgentSession[]> {
  const rollouts = await indexCodexRollouts();
  return Promise.all(
    sessions.map(async (session) => {
      const file = rollouts.get(session.id);
      if (!file) return session;
      try {
        return { ...session, ...(await codexRolloutStats(file)) };
      } catch {
        return session;
      }
    }),
  );
}

function codexSessions(page: any): AgentSession[] {
  const data: any[] = Array.isArray(page?.data) ? page.data : [];
  const sessions: AgentSession[] = [];
  for (const thread of data) {
    if (typeof thread?.id !== 'string') continue;
    const title = clipTitle(String(thread.name || thread.preview || ''));
    if (!title) continue;
    // ASSUMED: updatedAt của codex tính bằng giây (nếu < 1e11 thì đổi sang ms)
    const raw = Number(thread.updatedAt ?? thread.updated_at ?? 0);
    const updatedAt = raw > 0 && raw < 1e11 ? raw * 1000 : raw;
    sessions.push({ id: thread.id, title, updatedAt });
  }
  return sessions;
}

// Codex tự lưu thread, lấy qua JSON-RPC `thread/list` của `codex app-server`
function listCodexSessions(executable?: string): Promise<AgentSession[]> {
  return new Promise((resolve, reject) => {
    const child = spawn(executable || process.env.CODEX_EXECUTABLE || 'codex', ['app-server'], {
      cwd: os.tmpdir(),
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    let buffer = '';
    let settled = false;
    const finish = (error: Error | null, value?: AgentSession[]): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.kill();
      if (error) reject(error);
      else resolve(value ?? []);
    };
    const timer = setTimeout(
      () => finish(new Error('codex chat listing timed out')),
      CODEX_TIMEOUT_MS,
    );
    const send = (message: object): void => {
      child.stdin.write(JSON.stringify(message) + '\n');
    };
    child.stdin.on('error', () => undefined);
    child.on('error', (error) => finish(error));
    child.on('exit', () => finish(new Error('codex app-server exited')));
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
        if (message.error && (message.id === 1 || message.id === 2)) {
          finish(new Error(message.error.message ?? 'codex request failed'));
          return;
        }
        if (message.id === 1) {
          send({ method: 'initialized' });
          // ASSUMED: thread/list không cần cwd, liệt kê thread của mọi project
          send({
            id: 2,
            method: 'thread/list',
            params: {
              sortKey: 'updated_at',
              limit: MAX_SESSIONS,
              sourceKinds: ['cli', 'vscode', 'exec', 'appServer', 'unknown'],
            },
          });
        } else if (message.id === 2) {
          finish(null, codexSessions(message.result));
          return;
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

// Fallback khi `thread/list` trả rỗng (vd app-server cũ không đọc được thread do bản khác tạo): đọc thẳng <CODEX_HOME>/session_index.jsonl
async function listCodexIndexSessions(): Promise<AgentSession[]> {
  const file = path.join(
    process.env.CODEX_HOME || path.join(os.homedir(), '.codex'),
    'session_index.jsonl',
  );
  let text: string;
  try {
    text = await fs.readFile(file, 'utf8');
  } catch {
    return [];
  }
  const sessions: AgentSession[] = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try {
      const entry = JSON.parse(line);
      const title = clipTitle(String(entry.thread_name ?? ''));
      if (typeof entry.id !== 'string' || !title) continue;
      sessions.push({ id: entry.id, title, updatedAt: Date.parse(entry.updated_at) || 0 });
    } catch {
      continue;
    }
  }
  return sessions.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_SESSIONS);
}

// ASSUMED: v2 `GET /api/session` trả { data: [...] }, v1 `GET /session` trả mảng; time.updated tính bằng ms
export async function listOpencodeSessions(server: OpencodeServer): Promise<AgentSession[]> {
  const route = server.protocol === 'v2' ? '/api/session?limit=' + MAX_SESSIONS : '/session';
  const response = await fetch(server.base + route, {
    headers: server.auth ? { Authorization: server.auth } : {},
    signal: AbortSignal.timeout(OPENCODE_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error('HTTP ' + response.status + ' at ' + route);
  const body: any = await response.json();
  const list: any[] = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : [];
  const sessions: AgentSession[] = list
    .filter((item) => typeof item?.id === 'string' && !item.parentID)
    .map((item) => {
      const t = item.tokens;
      // ASSUMED: tổng token = input + output + reasoning (không tính cache)
      const totalTokens = t
        ? Number(t.input ?? 0) + Number(t.output ?? 0) + Number(t.reasoning ?? 0)
        : undefined;
      const modelId = item.model?.id ?? item.modelID;
      return {
        id: item.id as string,
        title:
          typeof item.title === 'string' && item.title.trim() ? clipTitle(item.title) : item.id,
        updatedAt: Number(item.time?.updated ?? item.time?.created ?? 0),
        totalTokens,
        modelId: typeof modelId === 'string' ? modelId : undefined,
      };
    })
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_SESSIONS);

  // ASSUMED: chỉ phần tử type 'user' | 'assistant' của /message được tính là msg
  if (server.protocol === 'v2') {
    await Promise.all(
      sessions.map(async (session) => {
        try {
          const res = await fetch(`${server.base}/api/session/${session.id}/message`, {
            headers: server.auth ? { Authorization: server.auth } : {},
            signal: AbortSignal.timeout(OPENCODE_TIMEOUT_MS),
          });
          if (!res.ok) return;
          const data: any = await res.json();
          const items: any[] = Array.isArray(data)
            ? data
            : Array.isArray(data?.data)
              ? data.data
              : [];
          session.messageCount = items.filter(
            (m) => m?.type === 'user' || m?.type === 'assistant',
          ).length;
        } catch {
          return;
        }
      }),
    );
  }
  return sessions;
}

export interface LoadedMessage {
  role: 'user' | 'assistant';
  content: string;
  thinking?: string;
  timestamp: number;
}

// ASSUMED: chỉ nạp text + thinking, bỏ qua tool call/result khi khôi phục hội thoại cũ
async function loadClaudeMessages(sessionId: string): Promise<LoadedMessage[]> {
  const root = path.join(
    process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'),
    'projects',
  );
  let dirs: string[];
  try {
    dirs = await fs.readdir(root);
  } catch {
    return [];
  }
  for (const dir of dirs) {
    let text: string;
    try {
      text = await fs.readFile(path.join(root, dir, `${sessionId}.jsonl`), 'utf8');
    } catch {
      continue;
    }
    const messages: LoadedMessage[] = [];
    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      let record: any;
      try {
        record = JSON.parse(line);
      } catch {
        continue;
      }
      if (record?.isSidechain === true) continue;
      const timestamp = Date.parse(record?.timestamp) || 0;
      if (record?.type === 'user') {
        const content = userText(record);
        if (content) messages.push({ role: 'user', content, timestamp });
      } else if (record?.type === 'assistant' && Array.isArray(record.message?.content)) {
        const parts: any[] = record.message.content;
        const content = parts
          .filter((p) => p?.type === 'text' && typeof p.text === 'string')
          .map((p) => p.text)
          .join('\n')
          .trim();
        const thinking = parts
          .filter((p) => p?.type === 'thinking' && typeof p.thinking === 'string')
          .map((p) => p.thinking)
          .join('\n')
          .trim();
        if (content || thinking) {
          messages.push({ role: 'assistant', content, thinking: thinking || undefined, timestamp });
        }
      }
    }
    return messages;
  }
  return [];
}

async function loadCodexMessages(sessionId: string): Promise<LoadedMessage[]> {
  const file = (await indexCodexRollouts()).get(sessionId);
  if (!file) return [];
  const text = await fs.readFile(file, 'utf8');
  const messages: LoadedMessage[] = [];
  for (const line of text.split('\n')) {
    if (!line.includes('"message"')) continue;
    let record: any;
    try {
      record = JSON.parse(line);
    } catch {
      continue;
    }
    const payload = record?.payload;
    if (
      record?.type !== 'response_item' ||
      payload?.type !== 'message' ||
      (payload.role !== 'user' && payload.role !== 'assistant')
    ) {
      continue;
    }
    const content = (Array.isArray(payload.content) ? payload.content : [])
      .filter((p: any) => typeof p?.text === 'string')
      .map((p: any) => p.text)
      .join('\n')
      .trim();
    if (!content || (payload.role === 'user' && content.startsWith('<'))) continue;
    messages.push({ role: payload.role, content, timestamp: Date.parse(record.timestamp) || 0 });
  }
  return messages;
}

// ASSUMED: v1 /session/{id}/message trả [{ info: { role, time }, parts }], v2 trả [{ type, content }]; chỉ lấy part text/reasoning
export async function loadOpencodeMessages(
  server: OpencodeServer,
  sessionId: string,
): Promise<LoadedMessage[]> {
  const route =
    server.protocol === 'v2'
      ? `/api/session/${sessionId}/message`
      : `/session/${sessionId}/message`;
  const response = await fetch(server.base + route, {
    headers: server.auth ? { Authorization: server.auth } : {},
    signal: AbortSignal.timeout(OPENCODE_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error('HTTP ' + response.status + ' at ' + route);
  const body: any = await response.json();
  const items: any[] = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : [];
  const messages: LoadedMessage[] = [];
  for (const item of items) {
    const role = item?.info?.role ?? item?.role ?? item?.type;
    if (role !== 'user' && role !== 'assistant') continue;
    const parts: any[] = Array.isArray(item.parts)
      ? item.parts
      : Array.isArray(item.content)
        ? item.content
        : [];
    const content = parts
      .filter((p) => p?.type === 'text' && typeof p.text === 'string')
      .map((p) => p.text)
      .join('\n')
      .trim();
    const thinking = parts
      .filter((p) => p?.type === 'reasoning' && typeof p.text === 'string')
      .map((p) => p.text)
      .join('\n')
      .trim();
    if (!content && !thinking) continue;
    messages.push({
      role,
      content,
      thinking: thinking || undefined,
      timestamp: Number(item?.info?.time?.created ?? item?.time?.created ?? 0),
    });
  }
  return messages;
}

export async function loadAgentSessionMessages(
  config: AgentConfig,
  sessionId: string,
): Promise<LoadedMessage[]> {
  if (config.kind === 'claude') return loadClaudeMessages(sessionId);
  if (config.kind === 'codex') return loadCodexMessages(sessionId);
  return [];
}

export async function listAgentSessions(config: AgentConfig): Promise<AgentSession[]> {
  if (config.kind === 'claude') return listClaudeSessions();
  if (config.kind === 'codex') {
    const fromServer = await listCodexSessions(config.executable).catch(() => [] as AgentSession[]);
    const sessions = fromServer.length > 0 ? fromServer : await listCodexIndexSessions();
    return enrichCodexSessions(sessions);
  }
  return [];
}
