import { extractParamValue } from '@renderer/components/Widgets/Zen/feature/Chat/utils/toolParser';
export interface GetResourceContentParams {
  filename: string;
  start_line?: number;
  end_line?: number;
}

/**
 * Parse get_resource_content tag from AI response.
 * Format:
 *   <get_resource_content>
 *     <filename>manifest.json</filename>
 *     <start_line>1</start_line>
 *     <end_line>100</end_line>
 *   </get_resource_content>
 */
export function parseGetResourceContent(innerContent: string): GetResourceContentParams {
  const params: GetResourceContentParams = { filename: '' };

  const filenameParam = extractParamValue(innerContent, 'filename');
  if (filenameParam) {
    params.filename = filenameParam.trim();
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
