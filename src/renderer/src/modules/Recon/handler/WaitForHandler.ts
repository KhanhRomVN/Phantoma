/**
 * WaitForHandler — Xử lý tool wait_for
 * Gọi IPC browser:waitFor và format kết quả.
 */

export class WaitForHandler {
  public async handle(
    targetId: string,
    condition: string,
    ref?: string,
    searchText?: string,
    timeoutMs?: number,
    tabId?: string,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const ipcResult = await (window as any).electron.ipcRenderer.invoke('browser:waitFor', {
        targetId,
        tabId,
        condition,
        ref,
        text: searchText,
        timeoutMs,
      });

      if (!ipcResult.success) {
        return { success: false, error: ipcResult.error || 'Failed to wait' };
      }

      const waitedMs = ipcResult.data?.waitedMs || 0;
      const outputText = `[wait_for] Condition met\ncondition: ${condition}\nref: ${ref || '-'}\nwaitedMs: ${waitedMs}`;

      return { success: true, data: { output: outputText } };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to wait' };
    }
  }
}