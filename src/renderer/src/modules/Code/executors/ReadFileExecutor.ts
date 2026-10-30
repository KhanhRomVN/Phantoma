import { CodeController } from '../CodeController';
import { ReadFileParams } from '../parsers/ReadFileParser';

/**
 * Execute read_file tool — gọi CodeController.executeTool().
 */
export async function executeReadFile(
  params: ReadFileParams,
  _bypassIgnore: boolean = false,
  basePath?: string | null,
): Promise<{ output: string } | null> {
  const filePath = (params as any).path || params.file_path || '';
  const result = await CodeController.executeTool('read_file', {
    path: filePath,
    basePath: basePath || undefined,
    start_line: params.start_line,
    end_line: params.end_line,
  });

  if (!result.success) {
    return { output: "[read_file for '" + filePath + "'] Result: Error - " + (result.error || '') };
  }

  const data = result.data || {};
  const content = data.content || '';
  let output = "[read_file for '" + filePath + "'] Result:\n```\n" + content;

  output += '\n```';
  return { output };
}