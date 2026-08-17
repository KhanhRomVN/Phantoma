import { extractParamValue } from '../../../utils/ToolParser';
import { GetResourceContentParams } from '../../../types/tool-types';

/**
 * Parse get_resource_content tag from AI response.
 * Format:
 *   <get_resource_content>
 *     <index>3</index>
 *     <start_line>1</start_line>
 *     <end_line>100</end_line>
 *   </get_resource_content>
 */
export function parseGetResourceContent(innerContent: string): GetResourceContentParams {
  const params: GetResourceContentParams = { index: -1 };

  const indexParam = extractParamValue(innerContent, 'index');
  if (indexParam) {
    const parsed = parseInt(indexParam, 10);
    if (!isNaN(parsed)) params.index = parsed;
  }

  const startLineParam = extractParamValue(innerContent, 'start_line');
  if (startLineParam) {
    const parsed = parseInt(startLineParam, 10);
    if (!isNaN(parsed)) params.start_line = parsed;
  }

  const endLineParam = extractParamValue(innerContent, 'end_line');
  if (endLineParam) {
    const parsed = parseInt(endLineParam, 10);
    if (!isNaN(parsed)) params.end_line = parsed;
  }

  return params;
}
