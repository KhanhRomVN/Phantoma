import type { EmulateTool } from '../tool.types';
import { executeReadReport } from './read-report.executor';
import { parseReadReport } from './read-report.parser';

export const readReportTool: EmulateTool = {
  name: 'read_report',
  execute: async (a, c) => executeReadReport(a.params || {}, c.activeTargetId),
  parse: parseReadReport,
};
