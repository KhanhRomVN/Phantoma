import { extractParamValue } from '@renderer/components/RightPanel/Zen/feature/Chat/utils/ToolParser';
import type { GetRepeaterDetailParams } from '@renderer/components/RightPanel/Zen/feature/Chat/types/tool-types';

/**
 * Parse get_repeater_detail tag from AI response.
 * Format: <get_repeater_detail><repeater_id>repeater_1</repeater_id></get_repeater_detail>
 */
export function parseGetRepeaterDetail(innerContent: string): GetRepeaterDetailParams {
  const params: GetRepeaterDetailParams = { repeater_id: '' };

  const idParam = extractParamValue(innerContent, 'repeater_id');
  if (idParam) params.repeater_id = idParam.trim();

  return params;
}
