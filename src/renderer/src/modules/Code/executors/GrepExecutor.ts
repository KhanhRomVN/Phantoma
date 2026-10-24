import { CodeController } from '../CodeController';
import { GrepParams } from '../parsers/GrepParser';

const escapeAttr = (s: string): string => s.replace(/"/g, "'");

export async function executeGrep(params: GrepParams): Promise<string | null> {
  const searchTerm = params.search_term || '';
  const filePath = (params as any).file_path || (params as any).filePath;
  const folderPath = params.folder_path;
  const targetDesc = filePath || folderPath || 'unknown';

  // Debug log - có thể xóa sau khi fix
  console.log('[DEBUG][GrepExecutor] input params:', params);

  if ((params as any)._validationError) {
    return (
      "[grep for '" +
      searchTerm +
      "' in '" +
      targetDesc +
      "'] Result: Error - " +
      (params as any)._validationError
    );
  }

  const result = await CodeController.executeTool('grep', {
    action: {
      search_term: searchTerm,
      file_path: filePath,
      folder_path: folderPath,
    },
  });

  // Debug log - có thể xóa sau khi fix
  console.log('[DEBUG][GrepExecutor] raw result:', result);

  if (!result.success) {
    return (
      "[grep for '" +
      searchTerm +
      "' in '" +
      targetDesc +
      "'] Result: Error - " +
      (result.error || '')
    );
  }

  const data = result.data || {};
  const grepData = data.result?.data || data;
  const results = grepData.results || {};
  const totalMatches = grepData.totalMatches || 0;
  const totalFiles = grepData.totalFilesSearched || 0;

  // Debug log - có thể xóa sau khi fix
  console.log('[DEBUG][GrepExecutor] grepData:', { totalMatches, totalFiles, keys: Object.keys(results) });

  let body = '';
  let fileCount = 0;
  for (const [fp, fileResult] of Object.entries(results)) {
    const matches = (fileResult as any).matches || [];
    if (matches.length > 0) {
      fileCount++;
      body += '<file path="' + fp + '" matches="' + matches.length + '">\n';
      matches.forEach((m: any) => {
        body += '  ' + m.lineNumber + ': ' + m.lineContent + '\n';
      });
      body += '</file>\n';
    }
  }

  return (
    "[grep for '" +
    searchTerm +
    "' in '" +
    targetDesc +
    "'] Result:\n" +
    '<grep_results search="' +
    escapeAttr(searchTerm) +
    '" total_matches="' +
    totalMatches +
    '" files="' +
    fileCount +
    '" files_searched="' +
    totalFiles +
    '">\n' +
    body +
    '</grep_results>'
  );
}