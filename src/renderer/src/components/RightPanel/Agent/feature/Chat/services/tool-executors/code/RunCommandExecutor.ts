import { CodeController } from '@renderer/controller/CodeController';
import type { RunCommandParams } from '../../../types/tool-types';

export const executeRunCommand = async (
  params: RunCommandParams,
  actionId: string,
): Promise<string | null> => {
  const result = await CodeController.executeTool('run_command', {
    commandText: params.command,
    folderPath: (params as any).folder_path || (params as any).folderPath,
  }, { actionId });

  if (!result.success) {
    return '[run_command] Result: Error - ' + (result.error || '');
  }
  // run_command là fire-and-forget, kết quả đến qua listener
  return '[run_command] Result: Command sent to terminal';
};