/**
 * ------------------------------------------------------------------
 * RunCommandExecutor (core, dùng chung cho mọi module)
 * ------------------------------------------------------------------
 * Chạy shell command trong một PTY riêng qua window.api (terminal:*),
 * stream output về UI và chỉ trả kết quả khi lệnh kết thúc hoặc bị finalize.
 *
 * Main exports:
 * - executeRunCommand      : Executor cho tool run_command
 * - finalizeRunCommand     : Kết thúc sớm một lệnh đang chạy (nút Finalize)
 * - sendRunCommandInput    : Gửi input vào terminal của lệnh đang chạy
 * - setRunCommandValidator : Module đăng ký hàm kiểm tra command an toàn
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
import type { ExecutorContext, ExecutorOptions } from '../../types/executor-types';

// ─── Types ──────────────────────────────────────────────────────────────
type CommandValidator = (command: string) => { safe: boolean; reason?: string };

interface RunSession {
  actionId: string;
  terminalId: string;
  finish: (exitCode: number | null, error?: string) => void;
}

// ─── State ──────────────────────────────────────────────────────────────
const sessions = new Map<string, RunSession>();
let commandValidator: CommandValidator | null = null;

const FENCE = '```';
const ANSI_REGEX = /\u001B\[[0-9;?]*[ -/]*[@-~]|\u001B\][^\u0007]*\u0007/g;

// ─── Helpers ────────────────────────────────────────────────────────────
const getApi = (): any => (window as any).api;

const post = (message: Record<string, any>): void => {
  window.postMessage(message, '*');
};

const clean = (text: string): string => text.replace(ANSI_REGEX, '').replace(/\r/g, '');

const resolveCwd = (folder: string | undefined, base: string | null | undefined) => {
  if (!folder) return base ?? undefined;
  if (!base || folder.startsWith('/') || /^[A-Za-z]:/.test(folder)) return folder;
  return `${base.replace(/\/$/, '')}/${folder}`;
};

const formatResult = (commandText: string, output: string, error?: string): string => {
  const head = error
    ? `Output: [run_command for '${commandText}'] Error - ${error}`
    : `Output: [run_command for '${commandText}']`;
  return [head, FENCE, output, FENCE].join('\n');
};

// ─── Public API ─────────────────────────────────────────────────────────
export const setRunCommandValidator = (fn: CommandValidator | null): void => {
  commandValidator = fn;
};

export const finalizeRunCommand = (target: { actionId?: string; terminalId?: string }): boolean => {
  for (const session of sessions.values()) {
    if (session.actionId === target.actionId || session.terminalId === target.terminalId) {
      session.finish(null);
      return true;
    }
  }
  return false;
};

export const finalizeAllRunCommands = (): void => {
  Array.from(sessions.values()).forEach((session) => session.finish(null));
};

export const sendRunCommandInput = (terminalId: string, data: string): void => {
  getApi()?.send?.('terminal:write', { terminalId, data });
};

export const executeRunCommand = async (
  action: any,
  ctx: ExecutorContext,
  _options?: ExecutorOptions,
): Promise<string | null> => {
  const actionId: string = action.actionId || `cmd-${Date.now()}`;
  const commandText: string = action.params?.command || '';
  if (!commandText.trim()) return '[run_command] Result: Error - command is required';

  const verdict = commandValidator?.(commandText);
  if (verdict && !verdict.safe) {
    return `[run_command] Result: Error - ${verdict.reason || 'Command validation failed'}`;
  }

  const api = getApi();
  if (!api?.invoke || !api?.on)
    return '[run_command] Result: Error - Terminal IPC is not available';

  const uid = Math.random().toString(36).slice(2, 10);
  const terminalId = `chat-cmd-${Date.now()}-${uid}`;
  const startMarker = `__PHM_START_${uid}`;
  const doneMarker = `__PHM_DONE_${uid}_`;
  const startRegex = new RegExp(`^${startMarker}$`, 'm');
  const doneRegex = new RegExp(`${doneMarker}([0-9]+)`);
  const cwd = resolveCwd(action.params?.folder_path || action.params?.cwd, ctx.folderPath);

  const stripEcho = (body: string): string => {
    const doneEcho = `echo "${doneMarker}$?"`;
    const echoAt = body.lastIndexOf(doneEcho);
    const trimmed = echoAt >= 0 ? body.slice(0, body.lastIndexOf('\n', echoAt) + 1) : body;
    const skip = commandText.split('\n').length;
    const lines = trimmed.split('\n');
    return lines.length > skip ? lines.slice(skip).join('\n') : '';
  };

  const readVisible = (
    raw: string,
  ): { output: string; exitCode: number | null; done: boolean } | null => {
    const text = clean(raw);
    const start = startRegex.exec(text);
    if (!start) return null;
    const visible = text.slice(start.index + start[0].length).replace(/^\n/, '');
    const done = doneRegex.exec(visible);
    if (!done) return { output: stripEcho(visible), exitCode: null, done: false };
    return {
      output: stripEcho(visible.slice(0, done.index)),
      exitCode: Number(done[1]),
      done: true,
    };
  };

  return new Promise<string | null>((resolve) => {
    let raw = '';
    let emitted = 0;
    let finished = false;

    const finish = (exitCode: number | null, error?: string): void => {
      if (finished) return;
      finished = true;
      offData();
      offExit();
      sessions.delete(actionId);
      const output = (readVisible(raw)?.output ?? '').trim();
      const failure = error ?? (exitCode ? `Exit code ${exitCode}` : undefined);
      post({ command: 'terminalStatusChanged', terminalId, status: 'free' });
      Promise.resolve(api.invoke('terminal:kill', terminalId)).catch(() => {});
      resolve(formatResult(commandText, output, failure));
    };

    const onData = (_event: unknown, payload: { terminalId: string; data: string }) => {
      if (finished || payload?.terminalId !== terminalId) return;
      raw += payload.data;
      const state = readVisible(raw);
      if (!state) return;
      const upTo = state.done ? state.output.length : state.output.lastIndexOf('\n') + 1;
      if (upTo > emitted) {
        post({ command: 'terminalOutput', terminalId, data: state.output.slice(emitted, upTo) });
        emitted = upTo;
      }
      if (state.done) finish(state.exitCode);
    };

    const onExit = (_event: unknown, payload: { terminalId: string; exitCode?: number }) => {
      if (payload?.terminalId !== terminalId) return;
      finish(payload.exitCode ?? null);
    };

    const offData = api.on('terminal:data', onData);
    const offExit = api.on('terminal:exit', onExit);

    sessions.set(actionId, { actionId, terminalId, finish });

    api
      .invoke('terminal:spawn', { terminalId, cwd })
      .then((spawnResult: unknown) => {
        post({ command: 'runCommandResult', actionId, terminalId });
        post({ command: 'terminalStatusChanged', terminalId, status: 'busy' });
        api.send('terminal:write', {
          terminalId,
          data: `echo ${startMarker}\r${commandText}\recho "${doneMarker}$?"\r`,
        });
      })
      .catch((err: unknown) => finish(null, err instanceof Error ? err.message : String(err)));
  });
};
