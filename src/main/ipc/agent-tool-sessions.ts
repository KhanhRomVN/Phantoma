import { spawn } from 'child_process'
import * as fs from 'fs/promises'
import * as os from 'os'
import * as path from 'path'
import type { AgentConfig } from '../../shared/types/agent-tool'

export interface AgentSession {
  id: string
  title: string
  updatedAt: number
}

const TITLE_LIMIT = 120
const MAX_SESSIONS = 50
const MAX_READ_BYTES = 5 * 1024 * 1024
const CODEX_TIMEOUT_MS = 10000

function clipTitle(text: string): string {
  const line =
    text
      .split('\n')
      .map((l) => l.trim())
      .find(Boolean) ?? ''
  return line.length > TITLE_LIMIT ? `${line.slice(0, TITLE_LIMIT)}…` : line
}

// ASSUMED: text bắt đầu bằng '<' là tag CLI tự thêm (command, caveat...), không phải người dùng gõ
function userText(record: any): string | null {
  const content = record?.message?.content
  const text =
    typeof content === 'string'
      ? content
      : Array.isArray(content)
        ? content
            .filter((p: any) => p?.type === 'text' && typeof p.text === 'string')
            .map((p: any) => p.text)
            .join('\n')
        : ''
  const trimmed = text.trim()
  return trimmed && !trimmed.startsWith('<') ? trimmed : null
}

function claudeTitle(records: any[]): string | null {
  const first = records
    .filter((r) => r?.type === 'user' && r.isSidechain !== true)
    .map(userText)
    .find(Boolean)
  if (!first) return null
  const last = (kind: string, key: string): string | null => {
    for (let i = records.length - 1; i >= 0; i--) {
      const r = records[i]
      if (r?.type === kind && typeof r[key] === 'string' && r[key].trim()) return clipTitle(r[key])
    }
    return null
  }
  return (
    last('custom-title', 'customTitle') ??
    last('ai-title', 'aiTitle') ??
    last('summary', 'summary') ??
    clipTitle(first)
  )
}

// 5MB đầu file là đủ để lấy title, tránh đọc cả transcript lớn
async function readHead(file: string): Promise<string> {
  const handle = await fs.open(file, 'r')
  try {
    const { size } = await handle.stat()
    const length = Math.min(size, MAX_READ_BYTES)
    const buffer = Buffer.alloc(length)
    await handle.read(buffer, 0, length, 0)
    return buffer.toString('utf-8')
  } finally {
    await handle.close()
  }
}

// Claude Code tự lưu transcript ở <config>/projects/<cwd-mã-hóa>/<sessionId>.jsonl
async function listClaudeSessions(): Promise<AgentSession[]> {
  const root = path.join(
    process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'),
    'projects'
  )
  const files: Array<{ file: string; id: string; mtime: number }> = []
  let dirs: string[]
  try {
    dirs = await fs.readdir(root)
  } catch {
    return []
  }
  for (const dir of dirs) {
    let names: string[]
    try {
      names = await fs.readdir(path.join(root, dir))
    } catch {
      continue
    }
    for (const name of names) {
      if (!name.endsWith('.jsonl')) continue
      const file = path.join(root, dir, name)
      try {
        const stat = await fs.stat(file)
        files.push({ file, id: name.slice(0, -'.jsonl'.length), mtime: Math.floor(stat.mtimeMs / 1000) })
      } catch {
        continue
      }
    }
  }
  files.sort((a, b) => b.mtime - a.mtime)

  const sessions: AgentSession[] = []
  for (const { file, id, mtime } of files) {
    if (sessions.length >= MAX_SESSIONS) break
    try {
      const records: any[] = []
      for (const line of (await readHead(file)).split('\n')) {
        if (!line.trim()) continue
        try {
          records.push(JSON.parse(line))
        } catch {
          continue
        }
      }
      const title = claudeTitle(records)
      if (title) sessions.push({ id, title, updatedAt: mtime })
    } catch {
      continue
    }
  }
  return sessions
}

function codexSessions(page: any): AgentSession[] {
  const data: any[] = Array.isArray(page?.data) ? page.data : []
  const sessions: AgentSession[] = []
  for (const thread of data) {
    if (typeof thread?.id !== 'string') continue
    const title = clipTitle(String(thread.name || thread.preview || ''))
    if (!title) continue
    // ASSUMED: updatedAt của codex tính bằng giây
    const updatedAt = Number(thread.updatedAt ?? thread.updated_at ?? 0)
    sessions.push({ id: thread.id, title, updatedAt })
  }
  return sessions
}

// Codex tự lưu thread, lấy qua JSON-RPC `thread/list` của `codex app-server`
function listCodexSessions(executable?: string): Promise<AgentSession[]> {
  return new Promise((resolve, reject) => {
    const child = spawn(executable || process.env.CODEX_EXECUTABLE || 'codex', ['app-server'], {
      cwd: os.tmpdir(),
      stdio: ['pipe', 'pipe', 'ignore']
    })
    let buffer = ''
    let settled = false
    const finish = (error: Error | null, value?: AgentSession[]): void => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      child.kill()
      if (error) reject(error)
      else resolve(value ?? [])
    }
    const timer = setTimeout(
      () => finish(new Error('codex chat listing timed out')),
      CODEX_TIMEOUT_MS
    )
    const send = (message: object): void => {
      child.stdin.write(JSON.stringify(message) + '\n')
    }
    child.stdin.on('error', () => undefined)
    child.on('error', (error) => finish(error))
    child.on('exit', () => finish(new Error('codex app-server exited')))
    child.stdout.on('data', (chunk) => {
      buffer += chunk.toString()
      let index = buffer.indexOf('\n')
      while (index >= 0) {
        const line = buffer.slice(0, index)
        buffer = buffer.slice(index + 1)
        index = buffer.indexOf('\n')
        let message: any
        try {
          message = JSON.parse(line)
        } catch {
          continue
        }
        if (message.error && (message.id === 1 || message.id === 2)) {
          finish(new Error(message.error.message ?? 'codex request failed'))
          return
        }
        if (message.id === 1) {
          send({ method: 'initialized' })
          // ASSUMED: thread/list không cần cwd, liệt kê thread của mọi project
          send({
            id: 2,
            method: 'thread/list',
            params: {
              sortKey: 'updated_at',
              limit: MAX_SESSIONS,
              sourceKinds: ['cli', 'vscode', 'exec', 'appServer', 'unknown']
            }
          })
        } else if (message.id === 2) {
          finish(null, codexSessions(message.result))
          return
        }
      }
    })
    send({
      id: 1,
      method: 'initialize',
      params: {
        clientInfo: { name: 'phantoma', title: 'Phantoma', version: '1.0.0' },
        capabilities: { experimentalApi: true }
      }
    })
  })
}

export async function listAgentSessions(config: AgentConfig): Promise<AgentSession[]> {
  if (config.kind === 'claude') return listClaudeSessions()
  if (config.kind === 'codex') return listCodexSessions(config.executable)
  // ASSUMED: OpenCode 2.x chưa có API liệt kê saved chats (wu cũng trả None)
  return []
}