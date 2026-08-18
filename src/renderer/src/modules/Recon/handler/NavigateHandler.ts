/**
 * NavigateHandler — Xử lý tool navigate
 * Gọi IPC browser:navigate và format kết quả.
 */

export class NavigateHandler {
  public async handle(targetId: string, url: string, tabId?: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const result = await (window as any).electron.ipcRenderer.invoke('browser:navigate', {
        targetId,
        url,
        tabId,
      });

      if (!result.success) {
        return { success: false, error: result.error || 'Failed to navigate' };
      }

      const text = [
        `[navigate] Navigation complete`,
        `url: ${url}`,
        `status: ${result.data?.status || 'loaded'}`,
      ].join('\n');

      return { success: true, data: { output: text } };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to navigate' };
    }
  }
}