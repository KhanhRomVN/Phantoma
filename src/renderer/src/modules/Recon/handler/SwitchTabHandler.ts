/**
 * SwitchTabHandler — Xử lý tool switch_tab
 * Gọi IPC browser:switchTab và format kết quả.
 */

export class SwitchTabHandler {
  public async handle(targetId: string, tabId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const result = await (window as any).electron.ipcRenderer.invoke('browser:switchTab', {
        targetId,
        tabId,
      });

      if (!result.success) {
        return { success: false, error: result.error || 'Failed to switch tab' };
      }

      const text = `[switch_tab] Switched to tab\ntabId: ${tabId}`;

      return { success: true, data: { output: text } };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to switch tab' };
    }
  }
}