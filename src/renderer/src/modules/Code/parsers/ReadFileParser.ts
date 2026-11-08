import { extractParamValue } from '@renderer/components/Widgets/Zen/feature/Chat/utils/toolParser';
import type { ReadFileParams } from '../types/tool-params';

export const parseReadFile = (innerContent: string): ReadFileParams => {
  // Parse according to tools-reference.ts schema: file_path only
  const filePath = extractParamValue(innerContent, 'file_path');
  const startLine = extractParamValue(innerContent, 'start_line');
  const endLine = extractParamValue(innerContent, 'end_line');

  return {
    file_path: filePath || '',
    start_line: startLine ? parseInt(startLine, 10) : undefined,
    end_line: endLine ? parseInt(endLine, 10) : undefined,
  };
};
