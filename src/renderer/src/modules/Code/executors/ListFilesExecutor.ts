import { ListFilesHandler } from '../handler/tool/ListFilesHandler';
import { ListFilesParams } from '../parsers/ListFilesParser';

const listFilesHandler = new ListFilesHandler();

export async function executeListFiles(
  params: ListFilesParams,
  _bypassIgnore: boolean = false,
  basePath?: string | null,
): Promise<string | null> {
  const folderPath = (params as any).path || params.folder_path || '';
  const data = await listFilesHandler.handle({
    path: folderPath,
    basePath: basePath || undefined,
    depth: params.depth,
    recursive: (params as any).recursive,
  } as any);

  if (data.error) {
    return "[list_files for '" + folderPath + "'] Result: Error - " + data.error;
  }

  const files = data.files || [];
  return JSON.stringify(files, null, 2);
}