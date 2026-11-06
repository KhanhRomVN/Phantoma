export class CaptureScreenshotHandler {
  public async handle(
    targetId: string,
    fullPage?: boolean,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      return await (window as any).electron.ipcRenderer.invoke('browser:screenshot', {
        targetId,
        fullPage,
      });
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to capture screenshot' };
    }
  }
}