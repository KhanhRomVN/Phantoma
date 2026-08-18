/**
 * FillInputParser — Parse <fill_input> tags from AI response
 */

export interface FillInputParams {
  ref: string;
  value: string;
  tabId?: string;
  targetId?: string;
}

export function parseFillInput(xmlString: string): FillInputParams | null {
  const refMatch = /<ref>(.*?)<\/ref>/s.exec(xmlString);
  const valueMatch = /<value>(.*?)<\/value>/s.exec(xmlString);
  const tabIdMatch = /<tabId>(.*?)<\/tabId>/s.exec(xmlString);
  const targetIdMatch = /<targetId>(.*?)<\/targetId>/s.exec(xmlString);

  const ref = refMatch?.[1]?.trim();
  const value = valueMatch?.[1]?.trim();
  
  if (!ref || value === undefined) {
    return null;
  }

  return {
    ref,
    value,
    tabId: tabIdMatch?.[1]?.trim(),
    targetId: targetIdMatch?.[1]?.trim(),
  };
}
