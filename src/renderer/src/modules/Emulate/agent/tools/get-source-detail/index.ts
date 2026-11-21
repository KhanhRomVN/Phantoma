import type { EmulateTool } from '../tool.types';
import { executeGetSourceDetail } from './get-source-detail.executor';
import { parseGetSourceDetail } from './get-source-detail.parser';

export const getSourceDetailTool: EmulateTool = {
  name: 'get_source_detail',
  execute: async (a) => executeGetSourceDetail(a.params || {}),
  parse: parseGetSourceDetail,
};
