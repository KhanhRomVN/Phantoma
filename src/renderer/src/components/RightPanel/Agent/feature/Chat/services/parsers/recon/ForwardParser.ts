/**
 * ForwardParser — Parse <forward> tags from AI response
 */

export interface ForwardParams {
  tabId?: string;
  targetId?: string;
}

export function parseForward(xmlString: string): ForwardParams | null {
  const tabIdMatch = /<tabId>(.*?)<\/tabId>/s.exec(xmlString);
  const targetIdMatch = /<targetId>(.*?)<\/targetId>/s.exec(xmlString);

  return {
    tabId: tabIdMatch?.[1]?.trim(),
    targetId: targetIdMatch?.[1]?.trim(),
  };
}
