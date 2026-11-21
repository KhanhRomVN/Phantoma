import type { EmulateTool } from '../tool.types';
import { executeListResources } from './list-resources.executor';
import { parseListResources } from './list-resources.parser';

export const listResourcesTool: EmulateTool = {
  name: 'list_resources',
  execute: async (a) => executeListResources(a.params || {}),
  parse: parseListResources,
};
