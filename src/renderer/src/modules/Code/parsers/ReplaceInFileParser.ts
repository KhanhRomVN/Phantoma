import { extractParamValue } from '@renderer/components/Widgets/Zen/feature/Chat/utils/toolParser';
import type { ReplaceInFileParams } from '../types/tool-params';

export const parseReplaceInFile = (innerContent: string): ReplaceInFileParams => {
  // Parse according to tools-reference.ts schema: file_path only
  const filePath = extractParamValue(innerContent, 'file_path');
  const oldContent = extractParamValue(innerContent, 'old_content');
  const newContent = extractParamValue(innerContent, 'new_content');

  return {
    file_path: filePath || '',
    old_content: oldContent || '',
    new_content: newContent || '',
  };
};
