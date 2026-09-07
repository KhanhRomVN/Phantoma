/**
 * SelectOptionHandler — Xử lý tool select_option
 * Gọi IPC browser:selectOption và format kết quả.
 */

export class SelectOptionHandler {
  public async handle(
    targetId: string,
    ref: string,
    value?: string,
    label?: string,
    tabId?: string,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const result = await (window as any).electron.ipcRenderer.invoke('browser:selectOption', {
        targetId,
        tabId,
        ref,
        value,
        label,
      });

      if (!result.success) {
        return { success: false, error: result.error || 'Failed to select option' };
      }

      const selected = result.data?.selected;
      const text = `[select_option] Option selected\nref: ${ref}\nselected: ${JSON.stringify(selected)}`;

      return { success: true, data: { output: text } };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to select option' };
    }
  }
}