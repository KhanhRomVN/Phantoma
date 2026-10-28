export type WaitCondition = 'element_visible' | 'element_hidden' | 'text_present' | 'network_idle';

export interface WaitForParams {
  condition: WaitCondition;
  ref?: string;
  text?: string;
  timeoutMs?: number;
}

export function parseWaitFor(xmlString: string): WaitForParams | null {
  const conditionMatch = new RegExp('<condition>(.*?)</condition>', 's').exec(xmlString);
  const refMatch = new RegExp('<ref>(.*?)</ref>', 's').exec(xmlString);
  const textMatch = new RegExp('<text>(.*?)</text>', 's').exec(xmlString);
  const timeoutMsMatch = new RegExp('<timeoutMs>(.*?)</timeoutMs>', 's').exec(xmlString);

  const condition = conditionMatch?.[1]?.trim() as WaitCondition;
  if (!condition) {
    return null;
  }

  const timeoutMsStr = timeoutMsMatch?.[1]?.trim();

  return {
    condition,
    ref: refMatch?.[1]?.trim(),
    text: textMatch?.[1]?.trim(),
    timeoutMs: timeoutMsStr ? parseInt(timeoutMsStr, 10) : undefined,
  };
}