import { extractParamValue } from '@renderer/components/RightPanel/Zen/feature/Chat/utils/ToolParser';
import type { DeleteRepeaterParams } from '@renderer/components/RightPanel/Zen/feature/Chat/types/tool-types';

/**
 * Parse delete_repeater tag from AI response.
 * Format: <delete_repeater><repeater_id>repeater_1</repeater_id></delete_repeater>
 */
export function parseDeleteRepeater(innerContent: string): DeleteRepeaterParams {
  const params: DeleteRepeaterParams = { repeater_id: '' };

  const idParam = extractParamValue(innerContent, 'repeater_id');
  if (idParam) params.repeater_id = idParam.trim();

  return params;
}
