import { extractParamValue } from '../../../utils/ToolParser';
import { GetSourceDetailParams } from '../../../types/tool-types';

/**
 * Parse get_source_detail tag from AI response.
 * Format: <get_source_detail><index>5</index></get_source_detail>
 */
export function parseGetSourceDetail(innerContent: string): GetSourceDetailParams {
  const params: GetSourceDetailParams = { index: -1 };

  const indexParam = extractParamValue(innerContent, 'index');
  if (indexParam) {
    const parsed = parseInt(indexParam, 10);
    if (!isNaN(parsed)) params.index = parsed;
  }

  return params;
}