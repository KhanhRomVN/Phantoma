import type { EmulateTool } from '../tool.types';
import { executeApplyFilter } from './apply-filter.executor';
import { parseApplyFilter } from './apply-filter.parser';

export const applyFilterTool: EmulateTool = {
  name: 'apply_filter',
  execute: async (a) => executeApplyFilter(a.params || {}),
  parse: parseApplyFilter,
};
