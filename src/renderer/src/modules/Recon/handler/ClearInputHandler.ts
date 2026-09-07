/**
 * ClearInputHandler — Xử lý tool clear_input
 * Gọi IPC browser:clearInput và format kết quả.
 */

export class ClearInputHandler {
  public async handle(
    targetId: string,
    ref: string,
    tabId?: string,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const result = await (window as any).electron.ipcRenderer.invoke('browser:clearInput', {
        targetId,
        tabId,
        ref,
      });

      if (!result.success) {
        return { success: false, error: result.error || 'Failed to clear input' };
      }

      const output = `[clear_input] Input cleared\nref: ${ref}`;

      return { success: true, data: { output } };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to clear input' };
    }
  }
}