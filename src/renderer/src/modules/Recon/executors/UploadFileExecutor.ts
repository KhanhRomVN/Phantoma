import { ReconController } from '@renderer/modules/Recon/ReconController';
import type { UploadFileParams } from '../parsers/UploadFileParser';

export async function executeUploadFile(
  params: UploadFileParams,
): Promise<{ success: boolean; output?: string; error?: string }> {
  try {
    const controller = ReconController.getInstance();
    const activeTarget = controller.getActiveTarget();
    if (!activeTarget) {
      return {
        success: false,
        error: 'No active target selected.',
      };
    }
    const targetId = activeTarget.id;

    const result = await ReconController.executeTool('upload_file', {
      targetId,
      ref: params.ref,
      filePath: params.filePath,
    });

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