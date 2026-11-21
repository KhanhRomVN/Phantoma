import { extractParamValue } from '@renderer/components/Widgets/Zen/feature/Chat/utils/toolParser';
export interface GetFuzzerDetailParams {
  fuzzer_id: string;
}

/**
 * Parse get_fuzzer_detail tag from AI response.
 * Format: <get_fuzzer_detail><fuzzer_id>fuzzer_1</fuzzer_id></get_fuzzer_detail>
 */
export function parseGetFuzzerDetail(innerContent: string): GetFuzzerDetailParams {
  const params: GetFuzzerDetailParams = { fuzzer_id: '' };

  const idParam = extractParamValue(innerContent, 'fuzzer_id');
  if (idParam) params.fuzzer_id = idParam.trim();

  return params;
}
