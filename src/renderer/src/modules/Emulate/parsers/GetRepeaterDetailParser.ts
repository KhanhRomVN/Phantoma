import { extractParamValue } from '@renderer/components/Widgets/Zen/feature/Chat/utils/toolParser';
export interface GetRepeaterDetailParams {
  repeater_id: string;
}

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
