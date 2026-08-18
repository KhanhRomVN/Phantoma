/**
 * ListTabsParser — Parse <list_tabs> tags from AI response
 */

export interface ListTabsParams {
  targetId?: string;
}

export function parseListTabs(xmlString: string): ListTabsParams | null {
  const targetIdMatch = /<targetId>(.*?)<\/targetId>/s.exec(xmlString);

  return {
    targetId: targetIdMatch?.[1]?.trim(),
  };
}
