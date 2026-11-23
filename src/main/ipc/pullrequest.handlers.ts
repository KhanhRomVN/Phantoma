/**
 * ------------------------------------------------------------------
 * IPC Pull Request Handlers
 * ------------------------------------------------------------------
 * Logic PR (gh CLI) nằm ở code server (`code/src/services/pr.service.ts`).
 * Chỉ giữ lại kênh mở URL ngoài vì shell.openExternal thuộc Electron main.
 *
 * Channels:
 * - pr:open-external : Mở URL https trong trình duyệt
 * ------------------------------------------------------------------
 */

import { ipcMain, shell } from 'electron';

export function setupPullRequestHandlers(): void {
  ipcMain.handle('pr:open-external', async (_event, url: string) => {
    if (typeof url !== 'string' || !url.startsWith('https://')) return { error: 'Invalid URL' };
    await shell.openExternal(url);
    return { ok: true };
  });
}