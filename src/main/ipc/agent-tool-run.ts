import { spawn } from 'child_process'
import { randomUUID } from 'crypto'
import * as os from 'os'
import type { AgentDoneStatus, AgentEvent, RunRequest, ToolCall } from '../../shared/types/agent-tool'

export interface RunHooks {
  emit: (event: AgentEvent) => void
  askPermission: (question: string, options: string[]) => Promise<boolean>
  onInterrupt: (handler: () => void) => void
}

const str = (input: any, key: string): string =>
  typeof input?.[key] === 'string' ? input[key] : ''

const optStr = (input: any, key: string): string | undefined =>
  typeof input?.[key] === 'string' ? input[key] : undefined

export function decodeToolUse(name: string, input: any): ToolCall {
  switch (name) {
    case 'Bash':
      return { type: 'exec', command: str(input, 'command') }
    case 'Read':
      return { type: 'read_file', path: str(input, 'file_path') }
    case 'Write':
      return {
        type: 'write_file',
        path: str(input, 'file_path'),
        content: optStr(input, 'content')
      }
    case 'Edit':
      return {
        type: 'edit_file',
        path: str(input, 'file_path'),
        old_string: optStr(input, 'old_string'),
        new_string: optStr(input, 'new_string')
      }
    case 'Grep':
      return { type: 'search', pattern: str(input, 'pattern'), path: optStr(input, 'path') }
    case 'Glob':
      return { type: 'glob', pattern: str(input, 'pattern') }
    case 'WebFetch':
      return { type: 'web_fetch', url: str(input, 'url'), prompt: optStr(input, 'prompt') }
    case 'WebSearch':
      return { type: 'web_search', query: str(input, 'query') }
    case 'TodoWrite': {
      const todos: any[] = Array.isArray(input?.todos) ? input.todos : []
      return {
        type: 'todo',
        items: todos.map((todo, index) => ({
          id: String(index),
          description: str(todo, 'content'),
          status: todo?.status === 'completed' ? 'completed' : 'pending'
        }))
      }
    }
    case 'Agent':
    case 'Task': {
      const description = str(input, 'description')
      return { type: 'unknown', name: description ? 'Agent: ' + description : 'Agent', input }
    }
  }
  const mcp = /^mcp__(.+?)__(.+)$/.exec(name)
  if (mcp) return { type: 'mcp', server: mcp[1], tool: mcp[2], input }
  return { type: 'unknown', name, input }
}

function permissionQuestion(name: string, input: any): string {
  const call = decodeToolUse(name, input)
  switch (call.type) {
    case 'exec':
      return 'Run `' + call.command + '`?'
    case 'write_file':
      return 'Write ' + call.path + '?'
    case 'edit_file':
      return 'Edit ' + call.path + '?'
    case 'read_file':
      return 'Read ' + call.path + '?'
    case 'web_fetch':
      return 'Fetch ' + call.url + '?'
    case 'web_search':
      return 'Search the web for ' + JSON.stringify(call.query) + '?'
    case 'mcp':
      return 'Use ' + call.server + ': ' + call.tool + '?'
    default:
      return 'Use ' + name + '?'
  }
}

function resultText(content: unknown): string | undefined {
  if (typeof content === 'string') return content || undefined
  if (!Array.isArray(content)) return undefined
  const text = content
    .map((block: any) => (block?.type === 'text' && typeof block.text === 'string' ? block.text : ''))
    .filter(Boolean)
    .join('\n')
  return text || undefined
}

const INTERRUPT_KILL_GRACE_MS = 3000

export function runClaude(
  request: RunRequest,
  executable: string,
  hooks: RunHooks
): Promise<void> {
  return new Promise((resolve) => {
    const args = [
      '--print',
      '--input-format',
      'stream-json',
      '--output-format',
      'stream-json',
      '--verbose',
      '--include-partial-messages',
      '--permission-prompt-tool',
      'stdio',
      '--permission-mode',
      'default',
      '--no-chrome'
    ]
    if (request.model) args.push('--model', request.model)
    if (request.resume) args.push('--resume=' + request.resume)

    // ASSUMED: chưa có cwd từ project hiện tại, fallback về thư mục home
    const child = spawn(executable, args, {
      cwd: request.cwd || os.homedir(),
      stdio: ['pipe', 'pipe', 'pipe']
    })

    let buffer = ''
    let stderr = ''
    let sessionId = request.resume
    let finished = false
    let interrupted = false
    let killTimer: NodeJS.Timeout | undefined

    const write = (value: unknown): void => {
      if (child.stdin.writable) child.stdin.write(JSON.stringify(value) + '\n')
    }

    const finish = (status: AgentDoneStatus, error?: string): void => {
      if (finished) return
      finished = true
      if (killTimer) clearTimeout(killTimer)
      hooks.emit({ type: 'done', status, error, sessionId })
      child.stdin.end()
      setTimeout(() => child.kill(), 2000).unref()
      resolve()
    }

    const respond = (requestId: string, response: unknown): void =>
      write({
        type: 'control_response',
        response: { subtype: 'success', request_id: requestId, response }
      })

    const respondError = (requestId: string, error: string): void =>
      write({
        type: 'control_response',
        response: { subtype: 'error', request_id: requestId, error }
      })

    const handleControlRequest = (frame: any): void => {
      const requestId: string = frame.request_id
      const body = frame.request ?? {}
      if (body.subtype !== 'can_use_tool') {
        respondError(requestId, 'Phantoma does not support ' + body.subtype + ' requests.')
        return
      }
      if (body.tool_name === 'AskUserQuestion') {
        respond(requestId, {
          behavior: 'deny',
          message: 'Interactive questions are not supported in this client.'
        })
        return
      }
      hooks
        .askPermission(permissionQuestion(body.tool_name, body.input), ['Allow', 'Deny'])
        .then((approved) =>
          respond(
            requestId,
            approved
              ? { behavior: 'allow', updatedInput: body.input }
              : { behavior: 'deny', message: 'The user declined this action.' }
          )
        )
        .catch(() => respond(requestId, { behavior: 'deny', message: 'Permission request failed.' }))
    }

    const handleFrame = (frame: any): void => {
      switch (frame.type) {
        case 'system':
          if (frame.subtype === 'init' && frame.session_id) {
            sessionId = frame.session_id
            hooks.emit({ type: 'session_started', sessionId: frame.session_id, model: frame.model })
          }
          return
        case 'stream_event': {
          if (frame.parent_tool_use_id) return
          const delta = frame.event?.delta
          if (frame.event?.type !== 'content_block_delta' || !delta) return
          if (delta.type === 'text_delta' && delta.text) {
            hooks.emit({ type: 'text_delta', text: delta.text })
          } else if (delta.type === 'thinking_delta' && delta.thinking) {
            hooks.emit({ type: 'reasoning_delta', text: delta.thinking })
          }
          return
        }
        case 'assistant': {
          if (frame.parent_tool_use_id) return
          const blocks: any[] = Array.isArray(frame.message?.content) ? frame.message.content : []
          for (const block of blocks) {
            if (block?.type === 'tool_use') {
              hooks.emit({
                type: 'tool_call',
                id: block.id,
                call: decodeToolUse(block.name, block.input)
              })
            }
          }
          if (typeof frame.error === 'string' && frame.error) {
            hooks.emit({ type: 'error', message: frame.error })
          }
          hooks.emit({ type: 'message_completed' })
          return
        }
        case 'user': {
          if (frame.parent_tool_use_id) return
          const blocks: any[] = Array.isArray(frame.message?.content) ? frame.message.content : []
          for (const block of blocks) {
            if (block?.type === 'tool_result') {
              hooks.emit({
                type: 'tool_result',
                id: block.tool_use_id,
                isError: block.is_error === true,
                output: resultText(block.content)
              })
            }
          }
          return
        }
        case 'control_request':
          handleControlRequest(frame)
          return
        case 'result': {
          if (frame.session_id) sessionId = frame.session_id
          if (interrupted) return finish('interrupted')
          if (frame.subtype === 'success') return finish('completed')
          const errors = Array.isArray(frame.errors)
            ? frame.errors
                .map((e: unknown) => (typeof e === 'string' ? e : JSON.stringify(e)))
                .join('; ')
            : ''
          return finish('errored', errors || String(frame.subtype))
        }
      }
    }

    hooks.onInterrupt(() => {
      if (finished || interrupted) return
      interrupted = true
      write({
        type: 'control_request',
        request_id: 'int_' + randomUUID(),
        request: { subtype: 'interrupt' }
      })
      killTimer = setTimeout(() => child.kill(), INTERRUPT_KILL_GRACE_MS)
    })

    child.stdout.on('data', (chunk) => {
      buffer += chunk.toString()
      let index = buffer.indexOf('\n')
      while (index >= 0) {
        const line = buffer.slice(0, index).trim()
        buffer = buffer.slice(index + 1)
        index = buffer.indexOf('\n')
        if (!line) continue
        let frame: any
        try {
          frame = JSON.parse(line)
        } catch {
          continue
        }
        handleFrame(frame)
      }
    })

    child.stderr.on('data', (chunk) => {
      stderr = (stderr + chunk.toString()).slice(-2000)
    })

    child.on('error', (error) => finish('errored', error.message))

    child.on('exit', (code) => {
      if (interrupted) return finish('interrupted')
      finish('errored', stderr.trim() || 'claude exited unexpectedly with code ' + code)
    })

    write({
      type: 'user',
      uuid: randomUUID(),
      message: { role: 'user', content: request.prompt },
      parent_tool_use_id: null
    })
  })
}