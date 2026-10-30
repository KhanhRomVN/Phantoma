export interface ListElementsParams {
  elementType?: string; // input, button, link, select, textarea, checkbox, radio
  labelContains?: string;
  visibleOnly?: boolean;
  limit?: number;
  offset?: number;
}

export function parseListElements(xmlString: string): ListElementsParams | null {
  const elementTypeMatch = new RegExp('<elementType>(.*?)</elementType>', 's').exec(xmlString);
  const labelContainsMatch = new RegExp('<labelContains>(.*?)</labelContains>', 's').exec(xmlString);
  const visibleOnlyMatch = new RegExp('<visibleOnly>(.*?)</visibleOnly>', 's').exec(xmlString);
  const limitMatch = new RegExp('<limit>(.*?)</limit>', 's').exec(xmlString);
  const offsetMatch = new RegExp('<offset>(.*?)</offset>', 's').exec(xmlString);

  const limitStr = limitMatch?.[1]?.trim();
  const offsetStr = offsetMatch?.[1]?.trim();

  return {
    elementType: elementTypeMatch?.[1]?.trim(),
    labelContains: labelContainsMatch?.[1]?.trim(),
    visibleOnly: visibleOnlyMatch?.[1]?.trim() === 'true',
    limit: limitStr ? parseInt(limitStr, 10) : undefined,
    offset: offsetStr ? parseInt(offsetStr, 10) : undefined,
  };
}