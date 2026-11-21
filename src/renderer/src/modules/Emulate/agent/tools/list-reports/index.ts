import type { EmulateTool } from '../tool.types';
import { executeListReports } from './list-reports.executor';
import { parseListReports } from './list-reports.parser';

export const listReportsTool: EmulateTool = {
  name: 'list_reports',
  execute: async (_a, c) => executeListReports(c.activeTargetId),
  parse: parseListReports,
};
