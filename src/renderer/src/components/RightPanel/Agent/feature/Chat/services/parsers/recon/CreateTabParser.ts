/**
 * CreateTabParser — Parse <create_tab> tags from AI response
 */

export interface CreateTabParams {
  url?: string;
  targetId?: string;
}

export function parseCreateTab(xmlString: string): CreateTabParams | null {
  const urlMatch = /<url>(.*?)<\/url>/s.exec(xmlString);
  const targetIdMatch = /<targetId>(.*?)<\/targetId>/s.exec(xmlString);

  return {
    url: urlMatch?.[1]?.trim(),
    targetId: targetIdMatch?.[1]?.trim(),
  };
}
