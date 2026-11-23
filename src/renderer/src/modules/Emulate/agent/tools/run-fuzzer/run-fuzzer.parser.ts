import { extractParamValue } from '@renderer/components/Widgets/Zen/screens/Chat/utils/toolParser';
export interface RunFuzzerParams {
  fuzzer_id: string;
}

/**
 * Parse run_fuzzer tag from AI response.
 * Format: <run_fuzzer><fuzzer_id>fuzzer_0</fuzzer_id></run_fuzzer>
 */
export function parseRunFuzzer(innerContent: string): RunFuzzerParams {
  const params: RunFuzzerParams = { fuzzer_id: '' };

  const idParam = extractParamValue(innerContent, 'fuzzer_id');
  if (idParam) params.fuzzer_id = idParam.trim();

  return params;
}
