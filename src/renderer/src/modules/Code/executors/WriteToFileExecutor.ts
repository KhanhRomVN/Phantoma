import { CodeController } from '../CodeController';
import { WriteToFileParams } from '../parsers/WriteToFileParser';

export async function executeWriteToFile(
  params: WriteToFileParams,
  _bypassIgnore: boolean = false,
  conversationId?: string,
  actionId?: string,
): Promise<string | null> {
  const filePath = (params as any).path || params.file_path || '';
  // Resolve the project root so relative paths write to the same place
  // that read_file resolves against. Without this, fs:write-file would
  // create the file relative to the Electron main process CWD.
  const { useCodeStore } = await import('../hooks/useCodeStore');
  const state = useCodeStore.getState();
  const project = state.projects.find((p) => p.id === state.currentProjectId);
  const basePath = project?.explorerRoot ?? project?.path;

  console.log('[executeWriteToFile][DEBUG] request:', { filePath, basePath });

  const result = await CodeController.executeTool(
    'write_to_file',
    {
      path: filePath,
      content: params.content || '',
      basePath,
    },
    { conversationId, actionId },
  );

  if (!result.success) {
    return "[write_to_file for '" + filePath + "'] Result: Error - " + (result.error || '');
  }
  return "[write_to_file for '" + filePath + "'] Result: File written successfully";
}