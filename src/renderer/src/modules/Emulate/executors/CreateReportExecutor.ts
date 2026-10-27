import { EmulateController } from '../EmulateController';
import type { CreateReportParams } from '@renderer/components/RightPanel/Zen/feature/Chat/types/tool-types';

/** Execute create_report tool — gọi EmulateController.executeTool() */
export async function executeCreateReport(
  params: CreateReportParams,
  contextTargetId?: string | null,
): Promise<string | null> {
  const result = await EmulateController.executeTool(
    'create_report',
    {
      content: params.content,
    },
    contextTargetId,
  );

  if (!result.success) {
    return '[create_report] Result: Error - ' + (result.error || '');
  }
  return (result.data as any)?.output || null;
}
