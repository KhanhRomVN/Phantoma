import { CodeController } from '@renderer/controller/CodeController';
import { ListFilesParams } from '../../../types/tool-types';

export async function executeListFiles(
  params: ListFilesParams,
  _bypassIgnore: boolean = false,
): Promise<string | null> {
  const folderPath = params.path || params.folder_path || '';
  const result = await CodeController.executeTool('list_files', {
    path: folderPath,
    depth: params.depth,
    recursive: params.recursive,
  });

  if (!result.success) {
    return "[list_files for '" + folderPath + "'] Result: Error - " + (result.error || '');
  }

  const data = result.data || {};
  const files = data.files || [];
  return JSON.stringify(files, null, 2);
}