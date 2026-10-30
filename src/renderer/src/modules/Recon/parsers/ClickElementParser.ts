export interface ClickElementParams {
  ref: string;
  clickType?: 'single' | 'double' | 'right';
  frameId?: string;
}

export function parseClickElement(xmlString: string): ClickElementParams | null {
  const refMatch = new RegExp('<ref>(.*?)</ref>', 's').exec(xmlString);
  const clickTypeMatch = new RegExp('<clickType>(.*?)</clickType>', 's').exec(xmlString);
  const frameIdMatch = new RegExp('<frameId>(.*?)</frameId>', 's').exec(xmlString);

  const ref = refMatch?.[1]?.trim();
  if (!ref) {
    return null;
  }

  const clickTypeStr = clickTypeMatch?.[1]?.trim();

  return {
    ref,
    clickType: clickTypeStr as ClickElementParams['clickType'],
    frameId: frameIdMatch?.[1]?.trim(),
  };
}