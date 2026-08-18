/**
 * ReloadParser — Parse <reload> tags from AI response
 */

export interface ReloadParams {
  tabId?: string;
  targetId?: string;
}

export function parseReload(xmlString: string): ReloadParams | null {
  const tabIdMatch = /<tabId>(.*?)<\/tabId>/s.exec(xmlString);
  const targetIdMatch = /<targetId>(.*?)<\/targetId>/s.exec(xmlString);

  return {
    tabId: tabIdMatch?.[1]?.trim(),
    targetId: targetIdMatch?.[1]?.trim(),
  };
}
