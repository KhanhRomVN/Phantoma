/**
 * ListTabsHandler — Xử lý tool list_tabs
 * Gọi IPC browser:listTabs và format kết quả dạng text table cho LLM.
 */

export class ListTabsHandler {
  public async handle(targetId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const result = await (window as any).electron.ipcRenderer.invoke('browser:listTabs', targetId);

      if (!result.success) {
        return { success: false, error: result.error || 'Failed to list tabs' };
      }

      const tabs = result.data?.tabs || [];
      const header = `| stt | tabId | title | url | isActive |`;
      const separator = `|-----|-------|-------|-----|----------|`;
      const rows = tabs.map((tab: any, i: number) => {
        const tabId = (tab.tabId || '').substring(0, 10).padEnd(10);
        const title = (tab.title || '').substring(0, 30).padEnd(30);
        const url = (tab.url || '').substring(0, 50);
        const isActive = tab.isActive ? 'true' : 'false';
        return `| ${String(i).padEnd(3)} | ${tabId} | ${title} | ${url} | ${isActive} |`;
      });

      const text = [
        `[list_tabs] Total tabs: ${tabs.length}`,
        header,
        separator,
        ...rows,
      ].join('\n');

      return { success: true, data: { output: text } };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to list tabs' };
    }
  }
}