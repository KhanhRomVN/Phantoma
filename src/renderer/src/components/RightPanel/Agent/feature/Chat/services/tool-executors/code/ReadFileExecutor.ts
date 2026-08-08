import { CodeController } from '@renderer/controller/CodeController';
import { ReadFileParams } from '../../../types/tool-types';

/**
 * Execute read_file tool — gọi CodeController.executeTool().
 */
export async function executeReadFile(
  params: ReadFileParams,
  _bypassIgnore: boolean = false,
): Promise<{ output: string; diagnostics?: any[] } | null> {
  const filePath = params.path || params.file_path || '';
  const result = await CodeController.executeTool('read_file', {
    path: filePath,
    start_line: params.start_line,
    end_line: params.end_line,
  });

  if (!result.success) {
    return { output: "[read_file for '" + filePath + "'] Result: Error - " + (result.error || '') };
  }

  const data = result.data || {};
  const content = data.content || '';
  let output = "[read_file for '" + filePath + "'] Result:\n```\n" + content;

  if (data.diagnostics && data.diagnostics.length > 0) {
    const errors = data.diagnostics.filter((d: any) => d.severity === 'Error');
    const warnings = data.diagnostics.filter((d: any) => d.severity === 'Warning');
    output += '\n\n**Summary:** ' + errors.length + ' error(s), ' + warnings.length + ' warning(s)\n\n';
    if (errors.length > 0) {
      output += '### Errors (' + errors.length + ')\n';
      errors.forEach((d: any, i: number) => {
        output += (i + 1) + '. `' + (d.message || '') + '` **Line ' + (d.line || 0) + '**: ' + (d.message || '') + '\n';
      });
    }
    if (warnings.length > 0) {
      output += '### Warnings (' + warnings.length + ')\n';
      warnings.forEach((d: any, i: number) => {
        output += (i + 1) + '. `' + (d.message || '') + '` **Line ' + (d.line || 0) + '**: ' + (d.message || '') + '\n';
      });
    }
  }

  output += '\n```';
  return { output, diagnostics: data.diagnostics };
}