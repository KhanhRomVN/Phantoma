import type { EmulateTool } from '../tool.types';
import { executeSendToFuzzer } from './send-to-fuzzer.executor';
import { parseSendToFuzzer } from './send-to-fuzzer.parser';

export const sendToFuzzerTool: EmulateTool = {
  name: 'send_to_fuzzer',
  execute: async (a, c) => executeSendToFuzzer(a.params || {}, c.activeTargetId),
  parse: parseSendToFuzzer,
};
