import { CodeController } from '@renderer/controller/CodeController';

export interface ViewReplaceHistoryParams {
  file_path?: string;
  filePath?: string;
  path?: string;
}

export async function executeViewReplaceHistory(
  params: ViewReplaceHistoryParams,
  _conversationId?: string,
): Promise<string | null> {
  const filePath = params.path || params.file_path || params.filePath || '';
  const result = await CodeController.executeTool('view_replace_history', { filePath });

  if (!result.success) {
    return "[view_replace_history for '" + filePath + "'] Result: Error - " + (result.error || '');
  }

  const data = result.data || {};
  const histories = data.history || [];

  if (histories.length === 0) {
    return "[view_replace_history for '" + filePath + "'] Result: No replace_in_file history found.";
  }

  let output = "[view_replace_history for '" + filePath + "'] Found " + histories.length + " version(s):\n\n";
  histories.forEach((h: any, index: number) => {
    const date = new Date(h.timestamp).toLocaleString();
    output += '**Version ' + h.version + '**\n';
    output += '- Errors: ' + h.errorCount + ', Warnings: ' + h.warningCount + '\n';
    output += '- Date: ' + date + '\n';
    if (index < histories.length - 1) output += '\n';
  });

  return output;
}