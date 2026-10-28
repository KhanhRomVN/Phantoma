export interface ScrollToElementParams {
  ref: string;
}

export function parseScrollToElement(xmlString: string): ScrollToElementParams | null {
  const refMatch = new RegExp('<ref>(.*?)</ref>', 's').exec(xmlString);

  const ref = refMatch?.[1]?.trim();
  if (!ref) {
    return null;
  }

  return {
    ref,
  };
}