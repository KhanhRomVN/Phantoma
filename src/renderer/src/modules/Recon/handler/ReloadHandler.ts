/**
 * ReloadHandler — Xử lý tool reload
 * Gọi IPC browser:reload và format kết quả.
 */

export class ReloadHandler {
  public async handle(targetId: string, tabId?: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const result = await (window as any).electron.ipcRenderer.invoke('browser:reload', {
        targetId,
        tabId,
      });

      if (!result.success) {
        return { success: false, error: result.error || 'Failed to reload page' };
      }

      const text = `[reload] Page reloaded\nurl: ${result.data?.url || 'unknown'}`;

      return { success: true, data: { output: text } };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to reload page' };
    }
  }
}