/**
 * ScrollParser — Parse <scroll> tags from AI response
 */

export interface ScrollParams {
  direction: 'up' | 'down' | 'top' | 'bottom';
  amount?: number;
  tabId?: string;
  targetId?: string;
}

export function parseScroll(xmlString: string): ScrollParams | null {
  const directionMatch = /<direction>(.*?)<\/direction>/s.exec(xmlString);
  const amountMatch = /<amount>(.*?)<\/amount>/s.exec(xmlString);
  const tabIdMatch = /<tabId>(.*?)<\/tabId>/s.exec(xmlString);
  const targetIdMatch = /<targetId>(.*?)<\/targetId>/s.exec(xmlString);

  const direction = directionMatch?.[1]?.trim() as ScrollParams['direction'];
  if (!direction || !['up', 'down', 'top', 'bottom'].includes(direction)) {
    return null;
  }

  const amount = amountMatch?.[1]?.trim();

  return {
    direction,
    amount: amount ? parseInt(amount, 10) : undefined,
    tabId: tabIdMatch?.[1]?.trim(),
    targetId: targetIdMatch?.[1]?.trim(),
  };
}
