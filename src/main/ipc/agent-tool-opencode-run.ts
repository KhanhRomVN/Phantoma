import type { AgentDoneStatus, RunRequest, ToolCall } from '../../shared/types/agent-tool';
import type { RunHooks } from './agent-tool-run';

export interface OpencodeServer {
  base: string;
  auth?: string;
  protocol?: 'v1' | 'v2';
  stop: () => void;
}

export interface OpencodeRunHooks extends RunHooks {
  startServer: () => Promise<OpencodeServer>;
}

const INTERRUPT_FINISH_GRACE_MS = 3000;
const PROMPT_RETRY_MAX_ATTEMPTS = 3;
const PROMPT_RETRY_BACKOFF_MS = 800;
const TRANSIENT_ERROR_REGEX =
  /insufficient balance|CreditsError|rate limit|too many requests|worker request limit|overloaded|temporarily unavailable|internal server error|bad gateway|service unavailable|stream error/i;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const isTransientError = (error: any): boolean => {
  const status = error?.status;
  if (typeof status === 'number' && (status === 402 || status === 429 || status >= 500))
    return true;
  return TRANSIENT_ERROR_REGEX.test(String(error?.message ?? ''));
};

const str = (input: any, key: string): string =>
  typeof input?.[key] === 'string' ? input[key] : '';

const optStr = (input: any, key: string): string | undefined =>
  typeof input?.[key] === 'string' ? input[key] : undefined;

const errorMessage = (error: any): string =>
  String(error?.data?.message ?? error?.message ?? error?.name ?? 'opencode error');

function decodeTool(name: string, input: any): ToolCall {
  switch (name) {
    case 'bash':
      return { type: 'exec', command: str(input, 'command') };
    case 'read':
      return { type: 'read_file', path: str(input, 'filePath') };
    case 'write':
      return {
        type: 'write_file',
        path: str(input, 'filePath'),
        content: optStr(input, 'content'),
      };
    case 'edit':
      return {
        type: 'edit_file',
        path: str(input, 'filePath'),
        old_string: optStr(input, 'oldString'),
        new_string: optStr(input, 'newString'),
      };
    case 'patch':
    case 'apply_patch':
      return { type: 'apply_patch', path: optStr(input, 'filePath') };
    case 'grep':
      return { type: 'search', pattern: str(input, 'pattern'), path: optStr(input, 'path') };
    case 'glob':
      return { type: 'glob', pattern: str(input, 'pattern') };
    case 'webfetch':
      return { type: 'web_fetch', url: str(input, 'url'), prompt: optStr(input, 'prompt') };
    case 'websearch':
      return { type: 'web_search', query: str(input, 'query') };
    case 'todowrite': {
      const todos: any[] = Array.isArray(input?.todos) ? input.todos : [];
      return {
        type: 'todo',
        items: todos.map((todo, index) => ({
          id: String(index),
          description: str(todo, 'content'),
          status:
            todo?.status === 'completed'
              ? 'completed'
              : todo?.status === 'cancelled'
                ? 'failed'
                : 'pending',
        })),
      };
    }
    case 'task': {
      const description = str(input, 'description');
      return { type: 'unknown', name: description ? 'Agent: ' + description : 'Agent', input };
    }
  }
  return { type: 'unknown', name, input };
}

// ASSUMED: dùng route v1 của `opencode serve` (/session, /event, prompt_async)
async function runOpencodeV1(request: RunRequest, hooks: OpencodeRunHooks): Promise<void> {
  const controller = new AbortController();
  let server: OpencodeServer | null = null;
  let sessionId = request.resume;
  let finished = false;
  let interrupted = false;
  let abortSession: (() => Promise<unknown>) | null = null;

  const finish = (status: AgentDoneStatus, error?: string): void => {
    if (finished) return;
    finished = true;
    hooks.emit({ type: 'done', status, error, sessionId });
    controller.abort();
    server?.stop();
  };

  hooks.onInterrupt(() => {
    if (finished || interrupted) return;
    interrupted = true;
    void abortSession?.().catch(() => undefined);
    setTimeout(() => finish('interrupted'), INTERRUPT_FINISH_GRACE_MS);
  });

  try {
    const current = await hooks.startServer();
    server = current;
    if (interrupted) return finish('interrupted');

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (current.auth) headers.Authorization = current.auth;

    const api = async (method: string, route: string, body?: unknown): Promise<any> => {
      const response = await fetch(current.base + route, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        throw Object.assign(
          new Error(
            'HTTP ' +
              response.status +
              ' at ' +
              route +
              (errorBody ? ': ' + errorBody.slice(0, 200) : ''),
          ),
          {
            status: response.status,
          },
        );
      }
      return response.status === 204 ? null : response.json().catch(() => null);
    };

    if (!sessionId) {
      const created = await api('POST', '/session', {});
      sessionId = created?.id;
      if (!sessionId) throw new Error('opencode did not return a session id');
    }
    const activeSession: string = sessionId;
    hooks.emit({ type: 'session_started', sessionId: activeSession, model: request.model });
    abortSession = () => api('POST', '/session/' + activeSession + '/abort');
    if (interrupted) return finish('interrupted');

    const stream = await fetch(current.base + '/event', {
      headers: { ...headers, Accept: 'text/event-stream' },
      signal: controller.signal,
    });
    if (!stream.ok || !stream.body) throw new Error('HTTP ' + stream.status + ' at /event');

    const assistantMessages = new Set<string>();
    const failedMessages = new Set<string>();
    const partTypes = new Map<string, string>();
    const partText = new Map<string, string>();
    const startedTools = new Set<string>();
    const finishedTools = new Set<string>();
    let textOpen = false;

    const emitDelta = (partId: string, delta: string): void => {
      if (!delta) return;
      const type = partTypes.get(partId);
      if (type === 'text') {
        textOpen = true;
        hooks.emit({ type: 'text_delta', text: delta });
      } else if (type === 'reasoning') {
        hooks.emit({ type: 'reasoning_delta', text: delta });
      }
    };

    const handlePart = (part: any): void => {
      if (!part?.id) return;
      if (part.type === 'text' || part.type === 'reasoning') {
        if (!assistantMessages.has(part.messageID)) return;
        partTypes.set(part.id, part.type);
        const full = typeof part.text === 'string' ? part.text : '';
        const previous = partText.get(part.id) ?? '';
        if (full.length > previous.length && full.startsWith(previous)) {
          partText.set(part.id, full);
          emitDelta(part.id, full.slice(previous.length));
        }
        return;
      }
      if (part.type !== 'tool') return;
      const id = String(part.callID ?? part.id);
      const state = part.state ?? {};
      const status = state.status;
      if (!startedTools.has(id) && status && status !== 'pending') {
        startedTools.add(id);
        if (textOpen) {
          textOpen = false;
          hooks.emit({ type: 'message_completed' });
        }
        hooks.emit({ type: 'tool_call', id, call: decodeTool(String(part.tool), state.input) });
      }
      if (
        startedTools.has(id) &&
        !finishedTools.has(id) &&
        (status === 'completed' || status === 'error')
      ) {
        finishedTools.add(id);
        const isError = status === 'error';
        const output = isError ? state.error : state.output;
        hooks.emit({
          type: 'tool_result',
          id,
          isError,
          output: typeof output === 'string' && output ? output : undefined,
        });
      }
    };

    const askPermission = (
      question: string,
      reply: (approved: boolean) => Promise<unknown>,
    ): void => {
      hooks
        .askPermission(question, ['Allow', 'Deny'])
        .then((approved) => reply(approved))
        .catch(() => undefined);
    };

    const handleEvent = (frame: any): void => {
      const event = frame?.payload ?? frame;
      const props = event?.properties ?? {};
      const eventSession = props.sessionID ?? props.part?.sessionID ?? props.info?.sessionID;
      if (eventSession && eventSession !== activeSession) return;
      switch (event?.type) {
        case 'message.updated': {
          const info = props.info;
          if (info?.role !== 'assistant' || !info.id) return;
          assistantMessages.add(info.id);
          const messageTokens = info.tokens;
          if (messageTokens) {
            const counts = [
              messageTokens.input,
              messageTokens.output,
              messageTokens.cache?.read,
              messageTokens.cache?.write,
            ].filter((n: unknown): n is number => typeof n === 'number');
            const total =
              typeof messageTokens.total === 'number' && messageTokens.total > 0
                ? messageTokens.total
                : counts.length > 0
                  ? counts.reduce((sum, n) => sum + n, 0)
                  : undefined;
            if (total !== undefined && !(total === 0 && !info.time?.completed)) {
              hooks.emit({ type: 'context_usage', tokens: total });
            }
          }
          if (info.error && !failedMessages.has(info.id)) {
            failedMessages.add(info.id);
            hooks.emit({ type: 'error', message: errorMessage(info.error) });
          }
          if (info.time?.completed && textOpen) {
            textOpen = false;
            hooks.emit({ type: 'message_completed' });
          }
          return;
        }
        case 'message.part.updated':
          handlePart(props.part);
          return;
        case 'message.part.delta': {
          if (props.field !== 'text' || typeof props.delta !== 'string') return;
          if (!partTypes.has(props.partID)) return;
          partText.set(props.partID, (partText.get(props.partID) ?? '') + props.delta);
          emitDelta(props.partID, props.delta);
          return;
        }
        case 'permission.updated': {
          const permissionId = props.id;
          askPermission(
            'Allow ' + String(props.title ?? props.type ?? 'this action') + '?',
            (approved) =>
              api('POST', '/session/' + activeSession + '/permissions/' + permissionId, {
                response: approved ? 'once' : 'reject',
              }),
          );
          return;
        }
        case 'permission.asked': {
          const permissionId = props.id;
          const patterns: string[] = Array.isArray(props.patterns) ? props.patterns : [];
          askPermission(
            'Allow ' +
              String(props.permission ?? 'action') +
              (patterns.length ? ': ' + patterns.join(', ') : '') +
              '?',
            (approved) =>
              api('POST', '/permission/' + permissionId + '/reply', {
                reply: approved ? 'once' : 'reject',
              }),
          );
          return;
        }
        case 'session.error':
          hooks.emit({ type: 'error', message: errorMessage(props.error) });
          return;
        case 'session.idle':
          finish(interrupted ? 'interrupted' : 'completed');
          return;
      }
    };

    const slash = request.model ? request.model.indexOf('/') : -1;
    const model =
      request.model && slash > 0
        ? { providerID: request.model.slice(0, slash), modelID: request.model.slice(slash + 1) }
        : undefined;

    // ASSUMED: retry transient lỗi khi gửi prompt (theo AIWeb2API opencode.provider), chỉ an toàn vì chưa có event nào được emit
    for (let attempt = 1; ; attempt += 1) {
      try {
        await api('POST', '/session/' + activeSession + '/prompt_async', {
          model,
          agent: request.agent,
          variant: request.variant, // ASSUMED: route v1 nhận `agent`/`variant`; v2 chưa truyền
          parts: [{ type: 'text', text: request.prompt }],
        });
        break;
      } catch (error) {
        if (interrupted || attempt >= PROMPT_RETRY_MAX_ATTEMPTS || !isTransientError(error))
          throw error;
        await sleep(PROMPT_RETRY_BACKOFF_MS * attempt);
      }
    }

    const reader = stream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (!finished) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
      let index = buffer.indexOf('\n\n');
      while (index >= 0) {
        const chunk = buffer.slice(0, index);
        buffer = buffer.slice(index + 2);
        index = buffer.indexOf('\n\n');
        const data = chunk
          .split('\n')
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).trim())
          .join('\n');
        if (!data) continue;
        try {
          handleEvent(JSON.parse(data));
        } catch {
          continue;
        }
      }
    }
    finish(interrupted ? 'interrupted' : 'errored', 'opencode event stream closed unexpectedly');
  } catch (error) {
    finish(
      interrupted ? 'interrupted' : 'errored',
      error instanceof Error ? error.message : String(error),
    );
  }
}

const v2Text = (content: any): string | undefined => {
  if (!Array.isArray(content)) return undefined;
  const text = content
    .filter((item) => item?.type === 'text' && typeof item.text === 'string')
    .map((item) => item.text)
    .join('\n');
  return text || undefined;
};

// ASSUMED: opencode v2 (/api/session, /api/event, /api/session/{id}/prompt); tên event permission.* và session.execution.failed/interrupted chưa xác minh
async function runOpencodeV2(
  request: RunRequest,
  hooks: OpencodeRunHooks,
  server: OpencodeServer,
): Promise<void> {
  const controller = new AbortController();
  let sessionId = request.resume;
  let finished = false;
  let interrupted = false;
  let interruptSession: (() => Promise<unknown>) | null = null;

  const finish = (status: AgentDoneStatus, error?: string): void => {
    if (finished) return;
    finished = true;
    hooks.emit({ type: 'done', status, error, sessionId });
    controller.abort();
    server.stop();
  };

  hooks.onInterrupt(() => {
    if (finished || interrupted) return;
    interrupted = true;
    void interruptSession?.().catch(() => undefined);
    setTimeout(() => finish('interrupted'), INTERRUPT_FINISH_GRACE_MS);
  });

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (server.auth) headers.Authorization = server.auth;

    const api = async (method: string, route: string, body?: unknown): Promise<any> => {
      const response = await fetch(server.base + route, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        const parsed = (() => {
          try {
            return JSON.parse(errorBody);
          } catch {
            return null;
          }
        })();
        const detail = String(parsed?.message ?? errorBody.slice(0, 200));
        throw Object.assign(
          new Error('HTTP ' + response.status + ' at ' + route + (detail ? ': ' + detail : '')),
          { status: response.status },
        );
      }
      return response.status === 204 ? null : response.json().catch(() => null);
    };

    if (interrupted) return finish('interrupted');

    if (!sessionId) {
      const slash = request.model ? request.model.indexOf('/') : -1;
      const created = await api('POST', '/api/session', {
        location: request.cwd ? { directory: request.cwd } : undefined,
        model:
          request.model && slash > 0
            ? { providerID: request.model.slice(0, slash), id: request.model.slice(slash + 1) }
            : undefined,
      });
      sessionId = created?.data?.id;
      if (!sessionId) throw new Error('opencode did not return a session id');
    }
    const activeSession: string = sessionId;
    hooks.emit({ type: 'session_started', sessionId: activeSession, model: request.model });
    interruptSession = () => api('POST', '/api/session/' + activeSession + '/interrupt');
    if (interrupted) return finish('interrupted');

    const stream = await fetch(server.base + '/api/event', {
      headers: { ...headers, Accept: 'text/event-stream' },
      signal: controller.signal,
    });
    if (!stream.ok || !stream.body) throw new Error('HTTP ' + stream.status + ' at /api/event');

    const toolNames = new Map<string, string>();
    const startedTools = new Set<string>();
    let textOpen = false;

    const closeText = (): void => {
      if (!textOpen) return;
      textOpen = false;
      hooks.emit({ type: 'message_completed' });
    };

    const handleEvent = (event: any): void => {
      const data = event?.data ?? {};
      if (data.sessionID && data.sessionID !== activeSession) return;
      const type = String(event?.type ?? '');

      if (/^permission\.(asked|requested|created)/.test(type)) {
        const requestId = data.requestID ?? data.id;
        hooks
          .askPermission(
            'Allow ' + String(data.action ?? data.permission ?? data.title ?? 'this action') + '?',
            ['Allow', 'Deny'],
          )
          .then((approved) =>
            api('POST', '/api/session/' + activeSession + '/permission/' + requestId + '/reply', {
              decision: approved ? 'once' : 'reject',
            }),
          )
          .catch(() => undefined);
        return;
      }

      switch (type) {
        case 'session.text.delta':
          if (typeof data.delta === 'string' && data.delta) {
            textOpen = true;
            hooks.emit({ type: 'text_delta', text: data.delta });
          }
          return;
        case 'session.text.ended':
          closeText();
          return;
        case 'session.reasoning.delta':
          if (typeof data.delta === 'string' && data.delta) {
            hooks.emit({ type: 'reasoning_delta', text: data.delta });
          }
          return;
        case 'session.tool.input.started':
          toolNames.set(String(data.id), String(data.name));
          return;
        case 'session.tool.called': {
          const id = String(data.id);
          if (startedTools.has(id)) return;
          startedTools.add(id);
          closeText();
          const name = toolNames.get(id) ?? 'unknown';
          const input = data.input ?? {};
          hooks.emit({
            type: 'tool_call',
            id,
            call: decodeTool(name === 'shell' ? 'bash' : name, {
              ...input,
              filePath: input.filePath ?? input.path,
            }),
          });
          return;
        }
        case 'session.tool.success':
          hooks.emit({
            type: 'tool_result',
            id: String(data.id),
            isError: false,
            output: v2Text(data.content),
          });
          return;
        case 'session.tool.failed':
          hooks.emit({
            type: 'tool_result',
            id: String(data.id),
            isError: true,
            output: typeof data.error?.message === 'string' ? data.error.message : undefined,
          });
          return;
        case 'session.execution.succeeded':
          finish(interrupted ? 'interrupted' : 'completed');
          return;
        case 'session.execution.interrupted':
          finish('interrupted');
          return;
        case 'session.execution.failed':
          finish(interrupted ? 'interrupted' : 'errored', errorMessage(data.error));
          return;
      }
    };

    for (let attempt = 1; ; attempt += 1) {
      try {
        await api('POST', '/api/session/' + activeSession + '/prompt', { text: request.prompt });
        break;
      } catch (error) {
        if (interrupted || attempt >= PROMPT_RETRY_MAX_ATTEMPTS || !isTransientError(error))
          throw error;
        await sleep(PROMPT_RETRY_BACKOFF_MS * attempt);
      }
    }

    const reader = stream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (!finished) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
      let index = buffer.indexOf('\n\n');
      while (index >= 0) {
        const chunk = buffer.slice(0, index);
        buffer = buffer.slice(index + 2);
        index = buffer.indexOf('\n\n');
        const data = chunk
          .split('\n')
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).trim())
          .join('\n');
        if (!data) continue;
        try {
          handleEvent(JSON.parse(data));
        } catch {
          continue;
        }
      }
    }
    finish(interrupted ? 'interrupted' : 'errored', 'opencode event stream closed unexpectedly');
  } catch (error) {
    finish(
      interrupted ? 'interrupted' : 'errored',
      error instanceof Error ? error.message : String(error),
    );
  }
}

export async function runOpencode(request: RunRequest, hooks: OpencodeRunHooks): Promise<void> {
  let server: OpencodeServer;
  try {
    server = await hooks.startServer();
  } catch (error) {
    hooks.emit({
      type: 'done',
      status: 'errored',
      error: error instanceof Error ? error.message : String(error),
    });
    return;
  }
  const started: OpencodeRunHooks = { ...hooks, startServer: async () => server };
  if (server.protocol === 'v2') return runOpencodeV2(request, started, server);
  return runOpencodeV1(request, started);
}
