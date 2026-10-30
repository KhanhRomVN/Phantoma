export interface SwitchTabParams {
  tabId: string;
}

export function parseSwitchTab(xmlString: string): SwitchTabParams | null {
  const tabIdMatch = new RegExp('<tabId>(.*?)</tabId>', 's').exec(xmlString);

  const tabId = tabIdMatch?.[1]?.trim();
  if (!tabId) {
    return null;
  }

  return {
    tabId,
  };
}