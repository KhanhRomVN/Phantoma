/**
 * ListFramesHandler — Xử lý tool list_frames
 * Gọi IPC browser:listFrames và format kết quả.
 */

export class ListFramesHandler {
  public async handle(
    targetId: string,
    tabId?: string,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const result = await (window as any).electron.ipcRenderer.invoke('browser:listFrames', {
        targetId,
        tabId,
      });

      if (!result.success) {
        return { success: false, error: result.error || 'Failed to list frames' };
      }

      const frames = result.data?.frames || [];
      const header = `| frameId | frameUrl | name |`;
      const separator = `|---------|----------|------|`;
      const rows = frames.map((f: any) => {
        const frameId = (f.frameId || '-').padEnd(7);
        const frameUrl = (f.frameUrl || '-').substring(0, 40).padEnd(40);
        const name = (f.name || '-').padEnd(8);
        return `| ${frameId} | ${frameUrl} | ${name} |`;
      });

      const text = [
        `[list_frames] Total frames: ${frames.length}`,
        header,
        separator,
        ...rows,
      ].join('\n');

      return { success: true, data: { output: text } };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to list frames' };
    }
  }
}