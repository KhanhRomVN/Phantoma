/**
 * GetPageContentHandler — Xử lý tool get_page_content
 * Gọi IPC browser:getPageContent và format kết quả dạng markdown cho LLM.
 * Chuẩn hóa truncation theo spec v2: 8000 chars, 20 elements (hiện 10 dòng).
 */

export class GetPageContentHandler {
  public async handle(
    targetId: string,
    tabId?: string,
    maxChars?: number,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const result = await (window as any).electron.ipcRenderer.invoke('browser:getPageContent', {
        targetId,
        tabId,
      });

      if (!result.success) {
        return { success: false, error: result.error || 'Failed to get page content' };
      }

      const data = result.data || {};
      const title = data.title || 'Untitled';
      const url = data.url || 'unknown';
      const markdown = data.markdown || '(No content extracted)';
      const elements = data.elements || [];

      // Giới hạn markdown — mặc định 8000, có thể ghi đè bằng maxChars
      const MAX_LENGTH = maxChars || 8000;
      const truncated = markdown.length > MAX_LENGTH;
      const displayMarkdown = truncated
        ? markdown.substring(0, MAX_LENGTH) + '\n...(truncated)'
        : markdown;

      // Format interactive elements summary — chuẩn hóa theo spec v2
      let elementSummary: string;
      if (elements.length === 0) {
        elementSummary = '\nNo interactive elements found.';
      } else if (elements.length > 20) {
        // Nếu > 20, chỉ hiện 10 dòng đầu + thông báo
        elementSummary = `\nInteractive elements: ${elements.length} found (use list_elements to see details)\n` +
          elements.slice(0, 10).map((el: any, i: number) =>
            `| ${el.ref || `el-${i}`} | ${el.type || 'unknown'} | ${el.label || el.text || ''} |`
          ).join('\n') +
          `\n...(${elements.length - 10} more — use list_elements to see details)`;
      } else {
        elementSummary = `\nInteractive elements: ${elements.length} found (use list_elements to see details)\n` +
          elements.map((el: any, i: number) =>
            `| ${el.ref || `el-${i}`} | ${el.type || 'unknown'} | ${el.label || el.text || ''} |`
          ).join('\n');
      }

      const text = [
        `[get_page_content] Page content retrieved`,
        `Title: ${title}`,
        `URL: ${url}`,
        ``,
        displayMarkdown,
        ``,
        elementSummary,
      ].join('\n');

      return { success: true, data: { output: text } };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to get page content' };
    }
  }
}