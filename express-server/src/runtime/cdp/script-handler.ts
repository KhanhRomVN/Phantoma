/**
 * ------------------------------------------------------------------
 * CDP Script Handler (port từ src/main/features/cdp/script-handler.ts)
 * ------------------------------------------------------------------
 */

import type { CdpManager } from './cdp-manager';
import { createLogger } from '../../utils/logger';

const logger = createLogger('CDP');

export async function handleScriptParsed(this: CdpManager, params: any) {
  const { scriptId, url, hasSourceURL, sourceMapURL } = params;

  if (!url || url.startsWith('extensions::') || url.startsWith('chrome-extension://')) {
    return;
  }

  if (url) {
    this.scriptIdMap.set(url, scriptId);
  }

  try {
    const result = await this.send('Debugger.getScriptSource', { scriptId });
    if (result && result.scriptSource) {
      const source = result.scriptSource;
      this.sendToRenderer('cdp:script-source', {
        scriptId,
        url,
        source,
        size: source.length,
        timestamp: Date.now(),
        hasSourceURL,
        sourceMapURL,
      });
    }
  } catch (e: any) {
    logger.warn(`Failed to get script source for ${scriptId}: ${e.message}`);
  }
}