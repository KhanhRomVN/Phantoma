import type { EmulateTool } from '../tool.types';
import { executeUpdateReport } from './update-report.executor';
import { parseUpdateReport } from './update-report.parser';

export const updateReportTool: EmulateTool = {
  name: 'update_report',
  execute: async (a, c) => executeUpdateReport(a.params || {}, c.activeTargetId),
  parse: parseUpdateReport,
};
