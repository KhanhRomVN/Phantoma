/**
 * ------------------------------------------------------------------
 * Terminal Handlers
 * ------------------------------------------------------------------
 * IPC message handlers for terminal operations within the Code module.
 * Adapted from Zen's TerminalManager — spawns processes and emits
 * events to the BottomPanel/Terminal component.
 *
 * Main handlers:
 * - RunCommandHandler     : Validate and forward shell command execution
 * - TerminalInputHandler  : Forward input to a specific terminal instance
 * - CloseTerminalHandler  : Close a terminal by its ID
 * - TerminalIpc           : Wrapper around terminal:* IPC (spawn/write/kill/events)
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Utils ──
import { SecurityValidator } from '../../utils/security';

// ─── Interfaces ─────────────────────────────────────────────────────────
interface BaseResult {
  command: string;
  requestId?: string;
  error?: string;
  [key: string]: any;
}

export interface TerminalDataPayload {
  terminalId: string;
  data: string;
}

export interface TerminalExitPayload {
  terminalId: string;
  exitCode?: number;
}

// ─── RunCommandHandler ──────────────────────────────────────────────────

export class RunCommandHandler {
  public handle(message: any): BaseResult {
    const commandText = message.commandText;
    if (!commandText) {
      return { command: 'runCommandResult', requestId: message.requestId, error: 'commandText is required' };
    }
    const securityCheck = SecurityValidator.validateCommand(commandText);
    if (!securityCheck.safe) {
      return { command: 'runCommandResult', requestId: message.requestId, error: securityCheck.reason || 'Command validation failed' };
    }
    return {
      command: 'runCommandInTerminal',
      requestId: message.requestId,
      actionId: message.actionId,
      commandText,
      folderPath: message.folderPath,
    };
  }
}

// ─── TerminalInputHandler ───────────────────────────────────────────────

export class TerminalInputHandler {
  public handle(message: any): BaseResult {
    if (!message.terminalId) {
      return { command: 'terminalInput', requestId: message.requestId, error: 'terminalId is required' };
    }
    return { command: 'terminalInput', requestId: message.requestId, terminalId: message.terminalId, input: message.input };
  }
}

// ─── CloseTerminalHandler ───────────────────────────────────────────────

export class CloseTerminalHandler {
  public handle(message: any): BaseResult {
    if (!message.terminalId) {
      return { command: 'closeTerminal', requestId: message.requestId, error: 'terminalId is required' };
    }
    return { command: 'closeTerminal', requestId: message.requestId, terminalId: message.terminalId };
  }
}

// ─── TerminalIpc ────────────────────────────────────────────────────────

export class TerminalIpc {
  private get api(): any {
    return (window as any).api;
  }

  public isAvailable(): boolean {
    return !!(this.api?.invoke && this.api?.on);
  }

  public spawn(terminalId: string, cwd?: string): Promise<unknown> {
    return this.api.invoke('terminal:spawn', { terminalId, cwd });
  }

  public write(terminalId: string, data: string): void {
    this.api?.send?.('terminal:write', { terminalId, data });
  }

  public kill(terminalId: string): void {
    Promise.resolve(this.api.invoke('terminal:kill', terminalId)).catch(() => {});
  }

  public onData(listener: (payload: TerminalDataPayload) => void): () => void {
    return this.api.on('terminal:data', (_event: unknown, payload: TerminalDataPayload) =>
      listener(payload),
    );
  }

  public onExit(listener: (payload: TerminalExitPayload) => void): () => void {
    return this.api.on('terminal:exit', (_event: unknown, payload: TerminalExitPayload) =>
      listener(payload),
    );
  }
}