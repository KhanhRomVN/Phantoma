/**
 * ClickElementParser — Parse <click_element> tags from AI response
 */

export interface ClickElementParams {
  ref: string;
  tabId?: string;
  targetId?: string;
}

export function parseClickElement(xmlString: string): ClickElementParams | null {
  const refMatch = /<ref>(.*?)<\/ref>/s.exec(xmlString);
  const tabIdMatch = /<tabId>(.*?)<\/tabId>/s.exec(xmlString);
  const targetIdMatch = /<targetId>(.*?)<\/targetId>/s.exec(xmlString);

  const ref = refMatch?.[1]?.trim();
  if (!ref) {
    return null;
  }

  return {
    ref,
    tabId: tabIdMatch?.[1]?.trim(),
    targetId: targetIdMatch?.[1]?.trim(),
  };
}
