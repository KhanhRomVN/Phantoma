/**
 * FillInputHandler — Xử lý tool fill_input
 * Gọi IPC browser:fillInput và format kết quả.
 */

export class FillInputHandler {
  public async handle(targetId: string, ref: string, value: string, tabId?: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const result = await (window as any).electron.ipcRenderer.invoke('browser:fillInput', {
        targetId,
        tabId,
        ref,
        value,
      });

      if (!result.success) {
        return { success: false, error: result.error || 'Failed to fill input' };
      }

      const text = `[fill_input] Input filled\nref: ${ref}\nvalue: ${value}`;

      return { success: true, data: { output: text } };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fill input' };
    }
  }
}