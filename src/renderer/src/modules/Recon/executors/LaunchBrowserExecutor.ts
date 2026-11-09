import { ReconController } from '@renderer/modules/Recon/ReconController';
import type { LaunchBrowserParams } from '../parsers/LaunchBrowserParser';

export async function executeLaunchBrowser(
  params: LaunchBrowserParams,
): Promise<{ success: boolean; output?: string; error?: string }> {
  try {
    const controller = ReconController.getInstance();
    const activeTarget = controller.getActiveTarget();
    if (!activeTarget) {
      return { success: false, error: 'No active target selected.' };
    }

    const result = await controller.launchBrowser(activeTarget.id, {
      profileUserDataDir: params.profileUserDataDir,
      profileDirectory: params.profileDirectory,
      url: params.url,
    });

    if (!result.success) {
      return { success: false, error: result.error || 'Failed to launch browser' };
    }
    return {
      success: true,
      output: result.data?.output || 'Browser launched successfully',
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unexpected error while launching browser',
    };
  }
}