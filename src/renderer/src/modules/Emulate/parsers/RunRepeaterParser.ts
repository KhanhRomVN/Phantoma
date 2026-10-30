import { extractParamValue } from '@renderer/components/RightPanel/Zen/feature/Chat/utils/ToolParser';
import type { RunRepeaterParams } from '@renderer/components/RightPanel/Zen/feature/Chat/types/tool-types';

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
