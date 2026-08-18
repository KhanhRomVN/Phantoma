/**
 * CloseTabHandler — Xử lý tool close_tab
 * Gọi IPC browser:closeTab và format kết quả.
 */

export class CloseTabHandler {
  public async handle(targetId: string, tabId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const result = await (window as any).electron.ipcRenderer.invoke('browser:closeTab', {
        targetId,
        tabId,
      });

      if (!result.success) {
        return { success: false, error: result.error || 'Failed to close tab' };
      }

      const text = `[close_tab] Tab closed\ntabId: ${tabId}`;

      return { success: true, data: { output: text } };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to close tab' };
    }
  }
}