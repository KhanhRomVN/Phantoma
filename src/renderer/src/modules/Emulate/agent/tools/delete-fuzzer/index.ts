import type { EmulateTool } from '../tool.types';
import { executeDeleteFuzzer } from './delete-fuzzer.executor';
import { parseDeleteFuzzer } from './delete-fuzzer.parser';

export const deleteFuzzerTool: EmulateTool = {
  name: 'delete_fuzzer',
  execute: async (a, c) => executeDeleteFuzzer(a.params || {}, c.activeTargetId),
  parse: parseDeleteFuzzer,
};
