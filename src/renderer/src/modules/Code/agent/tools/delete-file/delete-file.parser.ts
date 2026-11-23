import { extractParamValue } from '@renderer/components/Widgets/Zen/feature/Chat/utils/toolParser';

import type { DeleteFileParams } from '../tool.types';

export const parseDeleteFile = (innerContent: string): DeleteFileParams => {
  // Parse according to tools-reference.ts schema: file_path only
  const filePath = extractParamValue(innerContent, 'file_path');

  return {
    file_path: filePath || '',
  };
};
