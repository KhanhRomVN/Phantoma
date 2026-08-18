/**
 * ListElementsHandler — Xử lý tool list_elements
 * Gọi IPC browser:listElements và format kết quả dạng text table cho LLM.
 */

export class ListElementsHandler {
  public async handle(targetId: string, tabId?: string, elementType?: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const result = await (window as any).electron.ipcRenderer.invoke('browser:listElements', {
        targetId,
        tabId,
        elementType,
      });

      if (!result.success) {
        return { success: false, error: result.error || 'Failed to list elements' };
      }

      const elements = result.data?.elements || [];
      const header = `| ref | type | selector | label | value |`;
      const separator = `|-----|------|----------|-------|-------|`;
      const rows = elements.map((el: any, i: number) => {
        const ref = (el.ref || `el-${i}`).substring(0, 15).padEnd(15);
        const type = (el.type || 'unknown').padEnd(8);
        const selector = (el.selector || '').substring(0, 25).padEnd(25);
        const label = (el.label || el.text || '').substring(0, 20).padEnd(20);
        const value = (el.value || '').substring(0, 20);
        return `| ${ref} | ${type} | ${selector} | ${label} | ${value} |`;
      });

      const typeInfo = elementType ? ` (type: ${elementType})` : '';
      const text = [
        `[list_elements] Total elements${typeInfo}: ${elements.length}`,
        header,
        separator,
        ...rows,
      ].join('\n');

      return { success: true, data: { output: text } };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to list elements' };
    }
  }
}