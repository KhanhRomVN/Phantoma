import { CodeController } from '@renderer/controller/CodeController';
import { FindFilesParams } from '../../parsers/code/FindFilesParser';

export interface FindFilesResult {
  fileName: string;
  matches: string[];
}

export async function executeFindFiles(params: FindFilesParams): Promise<{
  output: string;
  results?: FindFilesResult[];
  totalMatches?: number;
} | null> {
  const fileNames = params.file_names || [];
  const fileName = fileNames.length > 0 ? fileNames[0] : (params as any).fileName || (params as any).file_name || '';
  const folderPath = (params as any).folderPath || (params as any).folder_path;

  const result = await CodeController.executeTool('find_files', {
    fileName,
    folderPath,
  });

  if (!result.success) {
    return { output: '[find_files] Result: Error - ' + (result.error || '') };
  }

  const data = result.data || {};
  const matches = data.matches || [];
  const totalMatches = data.totalMatches || matches.length;

  let output = '[find_files] Found ' + totalMatches + ' file(s)\n\n';
  if (totalMatches === 0) {
    output += 'No files found.';
  } else {
    matches.forEach((m: any) => {
      output += '- ' + (m.path || m) + '\n';
    });
  }

  return { output, totalMatches };
}