import { extractParamValue } from '@renderer/components/Widgets/Zen/features/chat/utils/toolParser';
export interface DeleteFuzzerParams {
  fuzzer_id: string;
}

/**
 * Parse delete_fuzzer tag from AI response.
 * Format: <delete_fuzzer><fuzzer_id>fuzzer_1</fuzzer_id></delete_fuzzer>
 */
export function parseDeleteFuzzer(innerContent: string): DeleteFuzzerParams {
  const params: DeleteFuzzerParams = { fuzzer_id: '' };

  const idParam = extractParamValue(innerContent, 'fuzzer_id');
  if (idParam) params.fuzzer_id = idParam.trim();

  return params;
}
