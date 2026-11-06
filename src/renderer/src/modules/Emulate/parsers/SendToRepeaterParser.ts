import { extractParamValue } from '@renderer/components/RightPanel/Zen/feature/Chat/utils/toolParser';
export interface SendToRepeaterParams {
  index: number;
}

/**
 * Parse send_to_repeater tag from AI response.
 * Format: <send_to_repeater><index>1</index></send_to_repeater>
 */
export function parseSendToRepeater(innerContent: string): SendToRepeaterParams {
  const params: SendToRepeaterParams = { index: -1 };

  const indexParam = extractParamValue(innerContent, 'index');
  if (indexParam) {
    const match = /^request_(\d+)$/i.exec(indexParam.trim());
    const parsed = match ? parseInt(match[1], 10) : parseInt(indexParam, 10);
    if (!isNaN(parsed)) params.index = parsed;
  }

  return params;
}
