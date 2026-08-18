/**
 * CloseTabParser — Parse <close_tab> tags from AI response
 */

export interface CloseTabParams {
  tabId: string;
  targetId?: string;
}

export function parseCloseTab(xmlString: string): CloseTabParams | null {
  const tabIdMatch = /<tabId>(.*?)<\/tabId>/s.exec(xmlString);
  const targetIdMatch = /<targetId>(.*?)<\/targetId>/s.exec(xmlString);

  const tabId = tabIdMatch?.[1]?.trim();
  if (!tabId) {
    return null;
  }

  return {
    tabId,
    targetId: targetIdMatch?.[1]?.trim(),
  };
}
