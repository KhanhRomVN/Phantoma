import type { EmulateTool } from '../tool.types';
import { executeCreateReport } from './create-report.executor';
import { parseCreateReport } from './create-report.parser';

export const createReportTool: EmulateTool = {
  name: 'create_report',
  execute: async (a, c) => executeCreateReport(a.params || {}, c.activeTargetId),
  parse: parseCreateReport,
};
