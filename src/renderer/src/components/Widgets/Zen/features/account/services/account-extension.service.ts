import { electronWidgetBridge, messageDispatcher } from '../../../shared/platform/electron-widget-bridge.service';

/** Message trả về từ extension cho request import (preview). */
export interface ImportPreviewMessage {
  status?: string;
  error?: unknown;
  isSqlite?: boolean;
  preview?: { data?: { accounts?: unknown } };
}

/**
 * Handler trả `true` để giữ listener (còn chờ message), `false` để gỡ.
 * Giữ nguyên contract của messageDispatcher.register(requestId, handler, timeout, onTimeout).
 */
export type ImportMessageHandler = (msg: ImportPreviewMessage) => boolean;

export const requestAccountImport = (
  apiUrl: string,
  handler: ImportMessageHandler,
  timeoutMs: number,
  onTimeout: () => void,
): void => {
  const requestId = `import-${Date.now()}`;
  messageDispatcher.register(requestId, handler as any, timeoutMs, onTimeout);
  electronWidgetBridge.postMessage({ command: 'importAccounts', apiUrl, requestId });
};

export const exportAccountsFile = (fileName: string, content: string): void => {
  electronWidgetBridge.postMessage({ command: 'exportAccounts', fileName, content });
};

export const openFolder = (path: string): void => {
  electronWidgetBridge.postMessage({ command: 'openFolder', path });
};

export const openBrowserWithProfile = (opts: {
  url: string;
  userDataDir?: string;
  profileDirectory?: string;
}): void => {
  electronWidgetBridge.postMessage({
    command: 'openBrowserWithProfile',
    url: opts.url,
    ...(opts.userDataDir ? { userDataDir: opts.userDataDir } : {}),
    ...(opts.profileDirectory ? { profileDirectory: opts.profileDirectory } : {}),
  });
};
