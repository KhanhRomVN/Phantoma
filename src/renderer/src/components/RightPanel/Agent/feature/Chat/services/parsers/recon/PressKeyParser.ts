/**
 * PressKeyParser — Parse <press_key> tags from AI response
 */

export interface PressKeyParams {
  key: string;
  tabId?: string;
  targetId?: string;
}

export function parsePressKey(xmlString: string): PressKeyParams | null {
  const keyMatch = /<key>(.*?)<\/key>/s.exec(xmlString);
  const tabIdMatch = /<tabId>(.*?)<\/tabId>/s.exec(xmlString);
  const targetIdMatch = /<targetId>(.*?)<\/targetId>/s.exec(xmlString);

  const key = keyMatch?.[1]?.trim();
  if (!key) {
    return null;
  }

  return {
    key,
    tabId: tabIdMatch?.[1]?.trim(),
    targetId: targetIdMatch?.[1]?.trim(),
  };
}
