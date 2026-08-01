import { extractParamValue } from '../../../utils/ToolParser';
import { GetHttpsDetailParams } from '../../../types/tool-types';

/**
 * Parse get_https_detail tag from AI response.
 * Format: <get_https_detail><index>3</index></get_https_detail>
 */
export function parseGetHttpsDetail(innerContent: string): GetHttpsDetailParams {
  const params: GetHttpsDetailParams = { index: -1 };

  const indexParam = extractParamValue(innerContent, 'index');
  if (indexParam) {
    const parsed = parseInt(indexParam, 10);
    if (!isNaN(parsed)) params.index = parsed;
  }

  return params;
}