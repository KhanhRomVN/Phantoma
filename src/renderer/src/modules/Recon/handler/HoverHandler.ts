/**
 * HoverHandler — Xử lý tool hover
 * Gọi IPC browser:hover và format kết quả.
 */

export class HoverHandler {
  public async handle(
    targetId: string,
    ref: string,
    tabId?: string,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const result = await (window as any).electron.ipcRenderer.invoke('browser:hover', {
        targetId,
        tabId,
        ref,
      });

      if (!result.success) {
        return { success: false, error: result.error || 'Failed to hover' };
      }

      const output = `[hover] Hover triggered\nref: ${ref}`;

      return { success: true, data: { output } };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to hover' };
    }
  }
}