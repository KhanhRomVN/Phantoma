/**
 * GetPageContentHandler — Xử lý tool get_page_content
 * Gọi IPC browser:getPageContent và format kết quả dạng markdown cho LLM.
 */

export class GetPageContentHandler {
  public async handle(targetId: string, tabId?: string): Promise<{ success: boolean; data?: any; error?: string }> {
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

      // Giới hạn markdown
      const MAX_LENGTH = 10000;
      const truncated = markdown.length > MAX_LENGTH;
      const displayMarkdown = truncated
        ? markdown.substring(0, MAX_LENGTH) + '\n...(truncated)'
        : markdown;
      void displayMarkdown; // sử dụng biến để tránh warning

      // Format interactive elements summary
      const elementSummary = elements.length > 0
        ? `\nInteractive elements: ${elements.length} found (use list_elements to see details)\n` +
          elements.slice(0, 5).map((el: any, i: number) =>
            `| ${el.ref || `el-${i}`} | ${el.type || 'unknown'} | ${el.label || el.text || ''} |`
          ).join('\n')
        : '\nNo interactive elements found.';

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