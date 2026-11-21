import { emulateApi } from '@renderer/modules/Emulate/shared/api/emulate.api';
import { runTool } from '@renderer/modules/Emulate/shared/utils/tool-result.util';
import { BROWSER_TOOL_NAMES } from './browser.parser';

/**
 * Browser chạy ở emulate server nên mọi browser tool đều chạy ở đó;
 * executor chỉ gọi API (emulateApi) rồi trả text output cho agent.
 */
export async function executeBrowserTool(
  tool: string,
  params: Record<string, any>,
  contextTargetId?: string | null,
): Promise<string | null> {
  return runTool(tool, async () => {
    if (params._validationError) {
      return `[${tool}] Result: Error - ${params._validationError}`;
    }
    if (!contextTargetId) {
      return `[${tool}] Error: targetId is required to control the browser`;
    }

    if (tool === 'launch_browser') {
      const base = params.profileUserDataDir
        ? String(params.profileUserDataDir).replace(/\/+$/, '')
        : undefined;
      // ASSUMED: server tách "<base>/<Default|Profile N>" thành user-data-dir + profile-directory
      const userDataDir =
        base && params.profileDirectory ? `${base}/${params.profileDirectory}` : base;
      const message = await emulateApi.launchBrowser(contextTargetId, {
        url: params.url ? String(params.url) : undefined,
        userDataDir,
      });
      return `[launch_browser] ${message}`;
    }

    return emulateApi.runBrowserTool(tool, contextTargetId, params);
  });
}

export const browserToolExecutors: Record<
  string,
  (a: any, c: any) => Promise<string | null>
> = Object.fromEntries(
  BROWSER_TOOL_NAMES.map((tool) => [
    tool,
    async (a: any, c: any) => executeBrowserTool(tool, a.params || {}, c.activeTargetId),
  ]),
);