import { extractParamValue } from '@renderer/components/RightPanel/Zen/feature/Chat/utils/ToolParser';
import type { GetHttpsDetailParams } from '@renderer/components/RightPanel/Zen/feature/Chat/types/tool-types';

/**
 * Parse get_https_detail tag from AI response.
 * Format: <get_https_detail><index>3</index></get_https_detail>
 */
export function parseGetHttpsDetail(innerContent: string): GetHttpsDetailParams {
  const params: GetHttpsDetailParams = { index: -1 };

  const indexParam = extractParamValue(innerContent, 'index');
  if (indexParam) {
    const match = /^request_(\d+)$/i.exec(indexParam.trim());
    const parsed = match ? parseInt(match[1], 10) : parseInt(indexParam, 10);
    if (!isNaN(parsed)) params.index = parsed;
  }

  return params;
}
