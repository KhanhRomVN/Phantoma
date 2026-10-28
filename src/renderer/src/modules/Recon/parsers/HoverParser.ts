export interface HoverParams {
  ref: string;
}

export function parseHover(xmlString: string): HoverParams | null {
  const refMatch = new RegExp('<ref>(.*?)</ref>', 's').exec(xmlString);

  const ref = refMatch?.[1]?.trim();
  if (!ref) {
    return null;
  }

  return {
    ref,
  };
}