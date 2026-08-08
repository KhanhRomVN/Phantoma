import { CodeController } from '@renderer/controller/CodeController';
import { GrepParams } from '../../../types/tool-types';

export async function executeGrep(params: GrepParams): Promise<string | null> {
  const searchTerm = params.search_term || params.searchTerm || '';
  const filePath = params.file_path || params.filePath;
  const folderPath = params.folder_path || params.folderPath;
  const targetDesc = filePath || folderPath || 'unknown';

  if ((params as any)._validationError) {
    return "[grep for '" + searchTerm + "' in '" + targetDesc + "'] Result: Error - " + (params as any)._validationError;
  }

  const result = await CodeController.executeTool('grep', {
    action: {
      search_term: searchTerm,
      file_path: filePath,
      folder_path: folderPath,
    },
  });

  if (!result.success) {
    return "[grep for '" + searchTerm + "' in '" + targetDesc + "'] Result: Error - " + (result.error || '');
  }

  const data = result.data || {};
  const grepData = data.result?.data || data;
  const results = grepData.results || {};
  const totalMatches = grepData.totalMatches || 0;
  const totalFiles = grepData.totalFilesSearched || 0;

  let output = "[grep for '" + searchTerm + "' in '" + targetDesc + "'] Result:\n";
  output += 'Found ' + totalMatches + ' match(es) in ' + totalFiles + ' file(s)\n';

  for (const [fp, fileResult] of Object.entries(results)) {
    const matches = (fileResult as any).matches || [];
    if (matches.length > 0) {
      output += '\n**' + fp + '** (' + matches.length + ' match(es))\n';
      matches.forEach((m: any) => {
        output += '  L' + m.lineNumber + ': ' + m.lineContent + '\n';
      });
    }
  }

  return output;
}