export interface CloseTabParams {
  tabId: string;
}

export function parseCloseTab(xmlString: string): CloseTabParams | null {
  const tabIdMatch = new RegExp('<tabId>(.*?)</tabId>', 's').exec(xmlString);

  const tabId = tabIdMatch?.[1]?.trim();
  if (!tabId) {
    return null;
  }

  return {
    tabId,
  };
}