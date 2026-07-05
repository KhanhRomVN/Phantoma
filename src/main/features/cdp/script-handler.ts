import { CdpManager } from './cdp-manager';

export async function handleScriptParsed(this: CdpManager, params: any) {
  const { scriptId, url, embedderName, hasSourceURL, sourceMapURL } = params;

  if (!url || url.startsWith('extensions::') || url.startsWith('chrome-extension://')) {
    return; // Skip extension scripts
  }

  // Store scriptId mapping for URL
  if (url) {
    this.scriptIdMap.set(url, scriptId);
  }

  // Immediately fetch the unpacked source from Debugger
  try {
    const result = await this.send('Debugger.getScriptSource', { scriptId });
    if (result && result.scriptSource) {
      const source = result.scriptSource;

      // Send unpacked source to renderer
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
  } catch (e: any) {}
}
