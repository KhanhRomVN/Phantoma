import { CdpManager } from './cdp-manager';

export async function handleScriptParsed(this: CdpManager, params: any) {
  const { scriptId, url, embedderName, hasSourceURL, sourceMapURL } = params;
  
  if (!url || url.startsWith('extensions::') || url.startsWith('chrome-extension://')) {
    return; // Skip extension scripts
  }

  // Store scriptId mapping for URL
  if (url) {
    this.scriptIdMap.set(url, scriptId);
    // console.log(`[CDP:Debugger] 📜 Script parsed: ${url.substring(0, 100)}`);
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
      
      // console.log(`[CDP:Debugger] ✅ Unpacked source captured: ${url.substring(0, 80)} (${source.length} bytes)`);
    }
  } catch (e: any) {
    // console.error(`[CDP:Debugger] ❌ Failed to get script source for ${url}:`, e?.message || e);
  }
}