import { extractParamValue } from '@renderer/components/Widgets/Zen/features/chat/utils/toolParser';
export interface SendToFuzzerParams {
  index: number;
}

/**
 * Parse send_to_fuzzer tag from AI response.
 * Format: <send_to_fuzzer><index>1</index></send_to_fuzzer>
 */
export function parseSendToFuzzer(innerContent: string): SendToFuzzerParams {
  const params: SendToFuzzerParams = { index: -1 };

  const indexParam = extractParamValue(innerContent, 'index');
  if (indexParam) {
    const match = /^request_(\d+)$/i.exec(indexParam.trim());
    const parsed = match ? parseInt(match[1], 10) : parseInt(indexParam, 10);
    if (!isNaN(parsed)) params.index = parsed;
  }

  return params;
}
