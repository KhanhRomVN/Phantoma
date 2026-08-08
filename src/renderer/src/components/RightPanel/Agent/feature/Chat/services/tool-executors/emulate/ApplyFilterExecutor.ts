import { EmulateController } from '@renderer/controller/EmulateController';
import type { ApplyFilterParams } from '../../parsers/emulate/ApplyFilterParser';

/** Execute apply_filter tool — gọi EmulateController.executeTool() */
export async function executeApplyFilter(params: ApplyFilterParams): Promise<string | null> {
  const result = await EmulateController.executeTool('apply_filter', params as any);

  if (!result.success) {
    return '[apply_filter] Result: Error - ' + (result.error || '');
  }
  return (result.data as any)?.output || null;
}