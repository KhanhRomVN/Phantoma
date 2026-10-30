import { CodeController } from '../CodeController';
import { ListFilesParams } from '../parsers/ListFilesParser';

export async function executeListFiles(
  params: ListFilesParams,
  _bypassIgnore: boolean = false,
  basePath?: string | null,
): Promise<string | null> {
  const folderPath = (params as any).path || params.folder_path || '';
  const result = await CodeController.executeTool('list_files', {
    path: folderPath,
    basePath: basePath || undefined,
    depth: params.depth,
    recursive: (params as any).recursive,
  });

  if (!result.success) {
    return "[list_files for '" + folderPath + "'] Result: Error - " + (result.error || '');
  }

  const data = result.data || {};
  const files = data.files || [];
  return JSON.stringify(files, null, 2);
}