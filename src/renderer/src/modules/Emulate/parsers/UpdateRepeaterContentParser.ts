import { extractParamValue } from '@renderer/components/RightPanel/Zen/feature/Chat/utils/ToolParser';
import type { UpdateRepeaterContentParams } from '@renderer/components/RightPanel/Zen/feature/Chat/types/tool-types';

/**
 * Parse update_repeater_content tag from AI response.
 * Format:
 *   <update_repeater_content>
 *     <repeater_id>repeater_1</repeater_id>
 *     <target>headers</target>
 *     <old_content>...</old_content>
 *     <new_content>...</new_content>
 *   </update_repeater_content>
 */
export function parseUpdateRepeaterContent(innerContent: string): UpdateRepeaterContentParams {
  const params: UpdateRepeaterContentParams = {
    repeater_id: '',
    target: 'body',
    old_content: '',
    new_content: '',
  };

  const idParam = extractParamValue(innerContent, 'repeater_id');
  if (idParam) params.repeater_id = idParam.trim();

  const targetParam = extractParamValue(innerContent, 'target');
  if (targetParam) {
    const target = targetParam.trim().toLowerCase();
    if (target === 'params' || target === 'headers' || target === 'body') {
      params.target = target;
    }
  }

  const oldParam = extractParamValue(innerContent, 'old_content');
  if (oldParam) params.old_content = oldParam;

  const newParam = extractParamValue(innerContent, 'new_content');
  if (newParam) params.new_content = newParam;

  return params;
}
