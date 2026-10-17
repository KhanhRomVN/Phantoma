/**
 * ------------------------------------------------------------------
 * Title Controller
 * ------------------------------------------------------------------
 * Cập nhật title của conversation hiện tại. Gọi IPC handler ở main
 * process để ghi field `title` vào file conversation JSON.
 * ------------------------------------------------------------------
 */

// ─── Types ──────────────────────────────────────────────────────────────
export interface TitleControllerResult {
  success: boolean;
  error?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────
function getIpc() {
  return (window as any).electron?.ipcRenderer;
}

// ─── Controller ─────────────────────────────────────────────────────────
export class TitleController {
  public static async updateTitle(
    moduleId: string,
    conversationId: string,
    title: string,
  ): Promise<TitleControllerResult> {
    const ipc = getIpc();
    if (!ipc) return { success: false, error: 'Electron IPC not available' };
    if (!title?.trim()) return { success: false, error: 'title is required' };
    try {
      const result = await ipc.invoke('title:update', {
        moduleId,
        conversationId,
        title,
      });
      if (!result?.success) {
        return { success: false, error: result?.error || 'Failed to update title' };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || String(err) };
    }
  }
}