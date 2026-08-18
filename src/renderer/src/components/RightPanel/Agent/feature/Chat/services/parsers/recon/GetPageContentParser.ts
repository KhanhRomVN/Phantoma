/**
 * GetPageContentParser — Parse <get_page_content> tags from AI response
 */

export interface GetPageContentParams {
  tabId?: string;
  targetId?: string;
}

export function parseGetPageContent(xmlString: string): GetPageContentParams | null {
  const tabIdMatch = /<tabId>(.*?)<\/tabId>/s.exec(xmlString);
  const targetIdMatch = /<targetId>(.*?)<\/targetId>/s.exec(xmlString);

  return {
    tabId: tabIdMatch?.[1]?.trim(),
    targetId: targetIdMatch?.[1]?.trim(),
  };
}
