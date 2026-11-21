import type { EmulateTool } from '../tool.types';
import { executeGetHttpsDetail } from './get-https-detail.executor';
import { parseGetHttpsDetail } from './get-https-detail.parser';

export const getHttpsDetailTool: EmulateTool = {
  name: 'get_https_detail',
  execute: async (a) => executeGetHttpsDetail(a.params || {}),
  parse: parseGetHttpsDetail,
};
