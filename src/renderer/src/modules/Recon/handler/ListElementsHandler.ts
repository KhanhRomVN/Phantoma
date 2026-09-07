/**
 * ListElementsHandler — Xử lý tool list_elements
 * Gọi IPC browser:listElements và format kết quả dạng text table cho LLM.
 */

export class ListElementsHandler {
  public async handle(
    targetId: string,
    tabId?: string,
    elementType?: string,
    labelContains?: string,
    visibleOnly?: boolean,
    limit?: number,
    offset?: number,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const result = await (window as any).electron.ipcRenderer.invoke('browser:listElements', {
        targetId,
        tabId,
        elementType,
        labelContains,
        visibleOnly,
        limit,
        offset,
      });

      if (!result.success) {
        return { success: false, error: result.error || 'Failed to list elements' };
      }

      const elements = result.data?.elements || [];
      const header = `| ref | type | selector | label | value | visible | boundingBox |`;
      const separator = `|-----|------|----------|-------|-------|---------|-------------|`;
      const rows = elements.map((el: any, i: number) => {
        const ref = (el.ref || `el-${i}`).substring(0, 15).padEnd(15);
        const type = (el.type || 'unknown').padEnd(8);
        const selector = (el.selector || '').substring(0, 25).padEnd(25);
        const label = (el.label || el.text || '').substring(0, 20).padEnd(20);
        const value = (el.value || '').substring(0, 20);
        const visible = el.visible === true ? 'true' : 'false';
        const bb = el.boundingBox
          ? `{x:${el.boundingBox.x},y:${el.boundingBox.y},w:${el.boundingBox.width},h:${el.boundingBox.height}}`
          : '-';
        return `| ${ref} | ${type} | ${selector} | ${label} | ${value} | ${visible} | ${bb} |`;
      });

      const filters: string[] = [];
      if (elementType) filters.push(`type: ${elementType}`);
      if (labelContains) filters.push(`label: ${labelContains}`);
      if (visibleOnly) filters.push('visible only');
      if (limit) filters.push(`limit: ${limit}`);
      if (offset) filters.push(`offset: ${offset}`);

      const filterInfo = filters.length > 0 ? ` (${filters.join(', ')})` : '';
      const text = [
        `[list_elements] Total elements${filterInfo}: ${elements.length}`,
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