export interface FillInputParams {
  ref: string;
  value: string;
}

export function parseFillInput(xmlString: string): FillInputParams | null {
  const refMatch = new RegExp('<ref>(.*?)</ref>', 's').exec(xmlString);
  const valueMatch = new RegExp('<value>(.*?)</value>', 's').exec(xmlString);

  const ref = refMatch?.[1]?.trim();
  const value = valueMatch?.[1]?.trim();

  if (!ref || value === undefined) {
    return null;
  }

  return {
    ref,
    value,
  };
}