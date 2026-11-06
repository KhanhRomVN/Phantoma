import { useReconStore } from '../stores/useReconStore';
import { UploadFileHandler } from '../handler/UploadFileHandler';
import type { UploadFileParams } from '../parsers/UploadFileParser';

const handler = new UploadFileHandler();

export async function executeUploadFile(
  params: UploadFileParams,
): Promise<{ success: boolean; output?: string; error?: string }> {
  try {
    const targetId = useReconStore.getState().activeTargetId;
    if (!targetId) {
      return {
        success: false,
        error: 'No active target selected.',
      };
    }

    const result = await handler.handle(targetId, params.ref, params.filePath);

    if (result.success) {
      return {
        success: true,
        output: result.data?.output || `Uploaded file: ${params.filePath}`,
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to upload file',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unexpected error while uploading file',
    };
  }
}