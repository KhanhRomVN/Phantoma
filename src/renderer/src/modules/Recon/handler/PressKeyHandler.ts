/**
 * PressKeyHandler — Xử lý tool press_key
 * Gọi IPC browser:pressKey và format kết quả.
 */

export class PressKeyHandler {
  public async handle(targetId: string, key: string, tabId?: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const result = await (window as any).electron.ipcRenderer.invoke('browser:pressKey', {
        targetId,
        tabId,
        key,
      });

      if (!result.success) {
        return { success: false, error: result.error || 'Failed to press key' };
      }

      const text = `[press_key] Key pressed\nkey: ${key}`;

      return { success: true, data: { output: text } };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to press key' };
    }
  }
}