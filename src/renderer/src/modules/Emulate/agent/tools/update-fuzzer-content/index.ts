import type { EmulateTool } from '../tool.types';
import { executeUpdateFuzzerContent } from './update-fuzzer-content.executor';
import { parseUpdateFuzzerContent } from './update-fuzzer-content.parser';

export const updateFuzzerContentTool: EmulateTool = {
  name: 'update_fuzzer_content',
  execute: async (a, c) => executeUpdateFuzzerContent(a.params || {}, c.activeTargetId),
  parse: parseUpdateFuzzerContent,
};
