/**
 * CreateTabHandler — Xử lý tool create_tab
 * Gọi IPC browser:createTab và format kết quả.
 */

export class CreateTabHandler {
  public async handle(targetId: string, url?: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const result = await (window as any).electron.ipcRenderer.invoke('browser:createTab', {
        targetId,
        url,
      });

      if (!result.success) {
        return { success: false, error: result.error || 'Failed to create tab' };
      }

      const text = [
        `[create_tab] Tab created`,
        `tabId: ${result.data?.tabId || 'unknown'}`,
        url ? `url: ${url}` : `url: (blank)`,
        `status: ${result.data?.status || 'loaded'}`,
      ].join('\n');

      return { success: true, data: { output: text } };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to create tab' };
    }
  }
}