import type { EmulateTool } from '../tool.types';
import { executeListHttps } from './list-https.executor';
import { parseListHttps } from './list-https.parser';

export const listHttpsTool: EmulateTool = {
  name: 'list_https',
  execute: async (a) => executeListHttps(a.params || {}),
  parse: parseListHttps,
};
