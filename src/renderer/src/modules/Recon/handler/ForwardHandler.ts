/**
 * ForwardHandler — Xử lý tool forward
 * Gọi IPC browser:forward và format kết quả.
 */

export class ForwardHandler {
  public async handle(targetId: string, tabId?: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const result = await (window as any).electron.ipcRenderer.invoke('browser:forward', {
        targetId,
        tabId,
      });

      if (!result.success) {
        return { success: false, error: result.error || 'Failed to navigate forward' };
      }

      const text = `[forward] Navigated forward\nurl: ${result.data?.url || 'unknown'}`;

      return { success: true, data: { output: text } };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to navigate forward' };
    }
  }
}