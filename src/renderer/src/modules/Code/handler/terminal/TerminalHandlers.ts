/**
 * TerminalHandlers — Gộp các handler thao tác Terminal.
 * Port từ Zen, adapt từ TerminalManager (spawn process) → emit event
 * đến BottomPanel/Terminal component trong Code module.
 */
import { SecurityValidator } from '../../utils/security';

interface BaseResult {
  command: string;
  requestId?: string;
  error?: string;
  [key: string]: any;
}

// ═══════════════════════════════════════════════════════════════════════
// RunCommandHandler
// ═══════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════
// TerminalInputHandler
// ═══════════════════════════════════════════════════════════════════════

export class TerminalInputHandler {
  public handle(message: any): BaseResult {
    if (!message.terminalId) {
      return { command: 'terminalInput', requestId: message.requestId, error: 'terminalId is required' };
    }
    return { command: 'terminalInput', requestId: message.requestId, terminalId: message.terminalId, input: message.input };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// CloseTerminalHandler
// ═══════════════════════════════════════════════════════════════════════

export class CloseTerminalHandler {
  public handle(message: any): BaseResult {
    if (!message.terminalId) {
      return { command: 'closeTerminal', requestId: message.requestId, error: 'terminalId is required' };
    }
    return { command: 'closeTerminal', requestId: message.requestId, terminalId: message.terminalId };
  }
}