import { EmulateController } from '../EmulateController';
import type { ReadReportParams } from '@renderer/components/RightPanel/Zen/feature/Chat/types/tool-types';

/** Execute read_report tool — gọi EmulateController.executeTool() */
export async function executeReadReport(
  params: ReadReportParams,
  contextTargetId?: string | null,
): Promise<string | null> {
  const result = await EmulateController.executeTool(
    'read_report',
    {
      report_id: params.report_id,
      start_line: params.start_line,
      end_line: params.end_line,
    },
    contextTargetId,
  );

  if (!result.success) {
    return '[read_report] Result: Error - ' + (result.error || '');
  }
  return (result.data as any)?.output || null;
}
