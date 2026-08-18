/**
 * ListElementsParser — Parse <list_elements> tags from AI response
 */

export interface ListElementsParams {
  elementType?: string; // input, button, link, select, textarea
  tabId?: string;
  targetId?: string;
}

export function parseListElements(xmlString: string): ListElementsParams | null {
  const elementTypeMatch = /<elementType>(.*?)<\/elementType>/s.exec(xmlString);
  const tabIdMatch = /<tabId>(.*?)<\/tabId>/s.exec(xmlString);
  const targetIdMatch = /<targetId>(.*?)<\/targetId>/s.exec(xmlString);

  return {
    elementType: elementTypeMatch?.[1]?.trim(),
    tabId: tabIdMatch?.[1]?.trim(),
    targetId: targetIdMatch?.[1]?.trim(),
  };
}
