/**
 * ------------------------------------------------------------------
 * Memory Controller
 * ------------------------------------------------------------------
 * Singleton controller cho Memory feature. Gọi IPC handler ở main
 * process để đọc/ghi memory.md toàn cục.
 *
 * Usage:
 *   const result = await MemoryController.executeTool('read_memory');
 * ------------------------------------------------------------------
 */

// ─── Types ──────────────────────────────────────────────────────────────
export interface MemoryControllerResult {
  success: boolean;
  data?: any;
  error?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────
function getIpc() {
  return (window as any).electron?.ipcRenderer;
}

// ─── Controller ─────────────────────────────────────────────────────────
export class MemoryController {
  public static async readMemory(): Promise<MemoryControllerResult> {
    const ipc = getIpc();
    if (!ipc) return { success: false, error: 'Electron IPC not available' };
    try {
      const data = await ipc.invoke('memory:read');
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err?.message || String(err) };
    }
  }

  public static async updateMemory(
    oldContent: string,
    newContent: string,
  ): Promise<MemoryControllerResult> {
    const ipc = getIpc();
    if (!ipc) return { success: false, error: 'Electron IPC not available' };
    try {
      const result = await ipc.invoke('memory:update', {
        old_content: oldContent,
        new_content: newContent,
      });
      if (!result?.success) {
        return { success: false, error: result?.error || 'Unknown error' };
      }
      return { success: true, data: result };
    } catch (err: any) {
      return { success: false, error: err?.message || String(err) };
    }
  }
}