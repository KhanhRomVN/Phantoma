/**
 * ClickElementHandler — Xử lý tool click_element
 * Gọi IPC browser:clickElement và format kết quả.
 */

export class ClickElementHandler {
  public async handle(targetId: string, ref: string, tabId?: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const result = await (window as any).electron.ipcRenderer.invoke('browser:clickElement', {
        targetId,
        tabId,
        ref,
      });

      if (!result.success) {
        return { success: false, error: result.error || 'Failed to click element' };
      }

      const text = `[click_element] Element clicked\nref: ${ref}`;

      return { success: true, data: { output: text } };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to click element' };
    }
  }
}