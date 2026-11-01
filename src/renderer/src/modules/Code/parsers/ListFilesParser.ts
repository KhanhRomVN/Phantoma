import { extractParamValue } from '@renderer/components/RightPanel/Zen/feature/Chat/utils/toolParser';

import type { ListFilesParams } from '../types/tool-params';
export const parseListFiles = (innerContent: string): ListFilesParams => {
  // Parse according to tools-reference.ts schema: folder_path only
  const folderPath = extractParamValue(innerContent, 'folder_path');
  const type = extractParamValue(innerContent, 'type');
  const depthStr = extractParamValue(innerContent, 'depth');

  let depth: number | 'max' | undefined;
  if (depthStr) {
    if (depthStr.toLowerCase() === 'max') {
      depth = 'max';
    } else {
      const parsed = parseInt(depthStr, 10);
      depth = !isNaN(parsed) ? parsed : undefined;
    }
  }

  return {
    folder_path: folderPath || '',
    type: type || undefined,
    depth,
  };
};