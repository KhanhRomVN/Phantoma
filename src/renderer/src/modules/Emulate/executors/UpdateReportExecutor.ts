import { EmulateController } from '../EmulateController';
import type { UpdateReportParams } from '@renderer/components/RightPanel/Zen/feature/Chat/types/tool-types';

/** Execute update_report tool — gọi EmulateController.executeTool() */
export async function executeUpdateReport(
  params: UpdateReportParams,
  contextTargetId?: string | null,
): Promise<string | null> {
  const result = await EmulateController.executeTool(
    'update_report',
    {
      report_ref: params.report_ref,
      old_content: params.old_content,
      new_content: params.new_content,
    },
    contextTargetId,
  );

  if (!result.success) {
    return '[update_report] Result: Error - ' + (result.error || '');
  }
  return (result.data as any)?.output || null;
}
