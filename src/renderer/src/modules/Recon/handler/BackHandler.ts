/**
 * BackHandler — Xử lý tool back
 * Gọi IPC browser:back và format kết quả.
 */

export class BackHandler {
  public async handle(targetId: string, tabId?: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const result = await (window as any).electron.ipcRenderer.invoke('browser:back', {
        targetId,
        tabId,
      });

      if (!result.success) {
        return { success: false, error: result.error || 'Failed to navigate back' };
      }

      const text = `[back] Navigated back\nurl: ${result.data?.url || 'unknown'}`;

      return { success: true, data: { output: text } };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to navigate back' };
    }
  }
}