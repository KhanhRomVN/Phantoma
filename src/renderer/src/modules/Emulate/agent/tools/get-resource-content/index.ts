import type { EmulateTool } from '../tool.types';
import { executeGetResourceContent } from './get-resource-content.executor';
import { parseGetResourceContent } from './get-resource-content.parser';

export const getResourceContentTool: EmulateTool = {
  name: 'get_resource_content',
  execute: async (a) => executeGetResourceContent(a.params || {}),
  parse: parseGetResourceContent,
};
