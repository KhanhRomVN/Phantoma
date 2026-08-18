/**
 * BackParser — Parse <back> tags from AI response
 */

export interface BackParams {
  tabId?: string;
  targetId?: string;
}

export function parseBack(xmlString: string): BackParams | null {
  const tabIdMatch = /<tabId>(.*?)<\/tabId>/s.exec(xmlString);
  const targetIdMatch = /<targetId>(.*?)<\/targetId>/s.exec(xmlString);

  return {
    tabId: tabIdMatch?.[1]?.trim(),
    targetId: targetIdMatch?.[1]?.trim(),
  };
}
