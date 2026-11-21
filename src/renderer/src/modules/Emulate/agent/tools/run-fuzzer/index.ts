import type { EmulateTool } from '../tool.types';
import { executeRunFuzzer } from './run-fuzzer.executor';
import { parseRunFuzzer } from './run-fuzzer.parser';

export const runFuzzerTool: EmulateTool = {
  name: 'run_fuzzer',
  execute: async (a, c) => executeRunFuzzer(a.params || {}, c.activeTargetId),
  parse: parseRunFuzzer,
};
