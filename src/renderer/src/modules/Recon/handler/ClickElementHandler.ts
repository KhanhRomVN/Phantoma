/**
 * ClickElementHandler — Xử lý tool click_element
 * Gọi IPC browser:clickElement và format kết quả.
 */

export class ClickElementHandler {
  public async handle(
    targetId: string,
    ref: string,
    tabId?: string,
    clickType?: 'single' | 'double' | 'right',
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const result = await (window as any).electron.ipcRenderer.invoke('browser:clickElement', {
        targetId,
        tabId,
        ref,
        clickType,
      });

      if (!result.success) {
        return { success: false, error: result.error || 'Failed to click element' };
      }

      const newTabId = result.data?.newTabId || null;
      const text = `[click_element] Element clicked\nref: ${ref}\nnewTabId: ${newTabId}`;

      return { success: true, data: { output: text, newTabId } };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to click element' };
    }
  }
}