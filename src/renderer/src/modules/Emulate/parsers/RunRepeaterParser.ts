import { extractParamValue } from '@renderer/components/Widgets/Zen/feature/Chat/utils/toolParser';
export interface RunRepeaterParams {
  repeater_id: string;
}

/**
 * Parse run_repeater tag from AI response.
 * Format: <run_repeater><repeater_id>repeater_0</repeater_id></run_repeater>
 */
export function parseRunRepeater(innerContent: string): RunRepeaterParams {
  const params: RunRepeaterParams = { repeater_id: '' };

  const idParam = extractParamValue(innerContent, 'repeater_id');
  if (idParam) params.repeater_id = idParam.trim();

  return params;
}
