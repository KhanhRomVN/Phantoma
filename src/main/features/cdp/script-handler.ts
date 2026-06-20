import { CdpManager } from './cdp-manager';

export function handleScriptParsed(this: CdpManager, params: any) {
  const { scriptId, url, embedderName } = params;
  if (url) {
    this.scriptIdMap.set(url, scriptId);
  }
}