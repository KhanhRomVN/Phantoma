import { extractParamValue } from '@renderer/components/RightPanel/Zen/feature/Chat/utils/ToolParser';
import type { GetSourceDetailParams } from '@renderer/components/RightPanel/Zen/feature/Chat/types/tool-types';

/**
 * Parse get_source_detail tag from AI response.
 * Format: <get_source_detail><filepath>example.com/assets/main.js</filepath></get_source_detail>
 */
export function parseGetSourceDetail(innerContent: string): GetSourceDetailParams {
  const params: GetSourceDetailParams = { filepath: '' };

  const filepathParam = extractParamValue(innerContent, 'filepath');
  if (filepathParam) {
    params.filepath = filepathParam.trim();
  }

  return params;
}
