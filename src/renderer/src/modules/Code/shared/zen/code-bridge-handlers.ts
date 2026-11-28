/**
 * ------------------------------------------------------------------
 * code-bridge-handlers
 * ------------------------------------------------------------------
 * Đăng ký các command chỉ xử lý ở renderer (không có IPC handler trong
 * main) của Code module vào ElectronWidgetBridge:
 * - terminal controls (closeTerminal, terminalInput, removeTerminal, stopCommand)
 * - UI navigation (openFile, openWriteToFile, openFileDiff, openTempImage)
 * ------------------------------------------------------------------
 */

import {
  electronWidgetBridge,
  messageDispatcher,
} from '@renderer/components/Widgets/Zen/shared/platform/electron-widget-bridge.service';
import {
  finalizeAllRunCommands,
  finalizeRunCommand,
  sendRunCommandInput,
} from '@renderer/modules/Code/agent/tools/run-command/run-command.executor';
import { useCodeStore } from '@renderer/modules/Code/shared/stores/code.store';

const UI_COMMANDS = ['openFile', 'openWriteToFile', 'openFileDiff', 'openTempImage'];

function handleUiCommand(message: any): void {
  const { command, requestId } = message;
  try {
    const store = useCodeStore.getState();
    const sessionId = store.activeWorkspaceSessionId;

    if (command === 'openFile' && message.path && sessionId) {
      const rawFilePath = String(message.path);
      let resolvedPath = rawFilePath;
      if (!rawFilePath.startsWith('/') && !/^[a-zA-Z]:[\\/]/.test(rawFilePath)) {
        const project = store.projects.find((p) => p.id === store.currentProjectId);
        const branch = (project as any)?.branches?.find((b: any) =>
          b.sessions?.some((sess: any) => sess.id === sessionId),
        );
        const basePath: string | undefined = branch?.path ?? project?.path;
        if (basePath) {
          resolvedPath = `${basePath.replace(/[\\/]+$/, '')}/${rawFilePath.replace(/^\.[\\/]/, '')}`;
        }
      }
      const name = resolvedPath.split(/[\\/]/).pop() || resolvedPath;
      store.requestOpenFile(
        sessionId,
        resolvedPath,
        name,
        message.line ? { line: message.line, column: message.column } : undefined,
      );
    }
  } catch (e) {
    console.warn(`[code-bridge-handlers] handleUiCommand failed for "${command}":`, e);
  }

  if (requestId) {
    messageDispatcher.resolve(requestId, { command, requestId, success: true });
  }
}

electronWidgetBridge.registerLocalCommand('closeTerminal', (message) => {
  finalizeRunCommand({ actionId: message.actionId, terminalId: message.terminalId });
});

electronWidgetBridge.registerLocalCommand('terminalInput', (message) => {
  if (message.terminalId) {
    sendRunCommandInput(message.terminalId, message.data ?? message.input ?? '');
  }
});

electronWidgetBridge.registerLocalCommand('removeTerminal', () => {});

electronWidgetBridge.registerLocalCommand('stopCommand', () => {
  finalizeAllRunCommands();
});

for (const command of UI_COMMANDS) {
  electronWidgetBridge.registerLocalCommand(command, handleUiCommand);
}