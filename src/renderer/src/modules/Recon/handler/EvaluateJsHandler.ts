/**
 * EvaluateJsHandler — Xử lý tool evaluate_js
 * Gọi IPC browser:evaluateJs và format kết quả.
 */

export class EvaluateJsHandler {
  public async handle(
    targetId: string,
    script: string,
    tabId?: string,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const result = await (window as any).electron.ipcRenderer.invoke('browser:evaluateJs', {
        targetId,
        tabId,
        script,
      });

      if (!result.success) {
        return { success: false, error: result.error || 'Failed to evaluate JS' };
      }

      const scriptResult = result.data?.result;
      const output = `[evaluate_js] Executed\nresult: ${JSON.stringify(scriptResult)}`;

      return { success: true, data: { output } };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to evaluate JS' };
    }
  }
}