/**
 * ScrollToElementHandler — Xử lý tool scroll_to_element
 * Gọi IPC browser:scrollToElement và format kết quả.
 */

export class ScrollToElementHandler {
  public async handle(
    targetId: string,
    ref: string,
    tabId?: string,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const result = await (window as any).electron.ipcRenderer.invoke('browser:scrollToElement', {
        targetId,
        tabId,
        ref,
      });

      if (!result.success) {
        return { success: false, error: result.error || 'Failed to scroll to element' };
      }

      const visible = result.data?.visible || false;
      const output = `[scroll_to_element] Scrolled into view\nref: ${ref}\nvisible: ${visible}`;

      return { success: true, data: { output } };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to scroll to element' };
    }
  }
}