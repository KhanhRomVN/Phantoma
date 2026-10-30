export interface ScrollParams {
  direction: 'up' | 'down' | 'top' | 'bottom';
  amount?: number;
}

export function parseScroll(xmlString: string): ScrollParams | null {
  const directionMatch = new RegExp('<direction>(.*?)</direction>', 's').exec(xmlString);
  const amountMatch = new RegExp('<amount>(.*?)</amount>', 's').exec(xmlString);

  const direction = directionMatch?.[1]?.trim() as ScrollParams['direction'];
  if (!direction || !['up', 'down', 'top', 'bottom'].includes(direction)) {
    return null;
  }

  const amount = amountMatch?.[1]?.trim();

  return {
    direction,
    amount: amount ? parseInt(amount, 10) : undefined,
  };
}