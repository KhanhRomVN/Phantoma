/**
 * ScrollHandler — Xử lý tool scroll
 * Gọi IPC browser:scroll và format kết quả.
 */

export class ScrollHandler {
  public async handle(targetId: string, direction: 'up' | 'down' | 'top' | 'bottom', amount?: number, tabId?: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const result = await (window as any).electron.ipcRenderer.invoke('browser:scroll', {
        targetId,
        tabId,
        direction,
        amount,
      });

      if (!result.success) {
        return { success: false, error: result.error || 'Failed to scroll' };
      }

      const text = `[scroll] Page scrolled\ndirection: ${direction}\namount: ${amount || 'default'}`;

      return { success: true, data: { output: text } };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to scroll' };
    }
  }
}