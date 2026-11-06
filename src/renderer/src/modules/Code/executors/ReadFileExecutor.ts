import { ReadFileHandler } from '../handler/tool/ReadFileHandler';
import type { ReadFileParams } from '../types/tool-params';

const readFileHandler = new ReadFileHandler();

/**
 * Execute read_file tool — gọi trực tiếp ReadFileHandler.
 */
export async function executeReadFile(
  params: ReadFileParams,
  _bypassIgnore: boolean = false,
  basePath?: string | null,
): Promise<{ output: string } | null> {
  const filePath = (params as any).path || params.file_path || '';
  const data = await readFileHandler.handle({
    path: filePath,
    basePath: basePath || undefined,
    start_line: params.start_line,
    end_line: params.end_line,
  } as any);

  if (data.error) {
    return { output: "[read_file for '" + filePath + "'] Result: Error - " + data.error };
  }

  const content = data.content || '';
  let output = "[read_file for '" + filePath + "'] Result:\n```\n" + content;

  output += '\n```';
  return { output };
}