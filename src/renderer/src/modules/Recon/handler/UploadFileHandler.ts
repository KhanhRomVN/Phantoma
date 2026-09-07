/**
 * UploadFileHandler — Xử lý tool upload_file
 * Gọi IPC browser:uploadFile và format kết quả.
 */

export class UploadFileHandler {
  public async handle(
    targetId: string,
    ref: string,
    filePath: string,
    tabId?: string,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const result = await (window as any).electron.ipcRenderer.invoke('browser:uploadFile', {
        targetId,
        tabId,
        ref,
        filePath,
      });

      if (!result.success) {
        return { success: false, error: result.error || 'Failed to upload file' };
      }

      const fileName = result.data?.fileName || filePath.split('/').pop();
      const output = `[upload_file] File uploaded\nref: ${ref}\nfileName: ${fileName}`;

      return { success: true, data: { output } };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to upload file' };
    }
  }
}