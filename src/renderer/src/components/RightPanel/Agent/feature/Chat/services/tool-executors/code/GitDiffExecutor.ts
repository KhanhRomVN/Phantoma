import { CodeController } from '@renderer/controller/CodeController';

export async function executeGitDiff(filePath: string, _requestId: string): Promise<string | null> {
  const result = await CodeController.executeTool('git_diff', { filePath });

  if (!result.success) {
    return "[git_diff for '" + filePath + "'] Result: Error - " + (result.error || '');
  }

  const data = result.data || {};
  const diffContent = data.output || data.diff || '';

  // Clean metadata lines
  const cleanLines = diffContent.split('\n').filter((line: string) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('diff')) return false;
    if (trimmed.startsWith('index ')) return false;
    if (trimmed.startsWith('new file mode')) return false;
    if (trimmed.startsWith('deleted file mode')) return false;
    if (trimmed.includes('No newline at end of file')) return false;
    return true;
  });

  return "[git_diff for '" + filePath + "'] Result:\n```diff\n" + cleanLines.join('\n') + '\n```';
}