import type { EmulateTool } from '../tool.types';
import { executeListFuzzers } from './list-fuzzers.executor';
import { parseListFuzzers } from './list-fuzzers.parser';

export const listFuzzersTool: EmulateTool = {
  name: 'list_fuzzers',
  execute: async (_a, c) => executeListFuzzers(c.activeTargetId),
  parse: parseListFuzzers,
};
