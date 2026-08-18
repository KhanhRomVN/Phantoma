/**
 * NavigateParser — Parse <navigate> tags from AI response
 */

export interface NavigateParams {
  url: string;
  tabId?: string;
  targetId?: string;
}

export function parseNavigate(xmlString: string): NavigateParams | null {
  const urlMatch = /<url>(.*?)<\/url>/s.exec(xmlString);
  const tabIdMatch = /<tabId>(.*?)<\/tabId>/s.exec(xmlString);
  const targetIdMatch = /<targetId>(.*?)<\/targetId>/s.exec(xmlString);

  const url = urlMatch?.[1]?.trim();
  if (!url) {
    return null;
  }

  return {
    url,
    tabId: tabIdMatch?.[1]?.trim(),
    targetId: targetIdMatch?.[1]?.trim(),
  };
}
