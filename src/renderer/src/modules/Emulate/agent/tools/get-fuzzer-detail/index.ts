import type { EmulateTool } from '../tool.types';
import { executeGetFuzzerDetail } from './get-fuzzer-detail.executor';
import { parseGetFuzzerDetail } from './get-fuzzer-detail.parser';

export const getFuzzerDetailTool: EmulateTool = {
  name: 'get_fuzzer_detail',
  execute: async (a, c) => executeGetFuzzerDetail(a.params || {}, c.activeTargetId),
  parse: parseGetFuzzerDetail,
};
