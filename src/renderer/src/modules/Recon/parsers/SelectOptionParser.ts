export interface SelectOptionParams {
  ref: string;
  value?: string;
  label?: string;
  frameId?: string;
}

export function parseSelectOption(xmlString: string): SelectOptionParams | null {
  const refMatch = new RegExp('<ref>(.*?)</ref>', 's').exec(xmlString);
  const valueMatch = new RegExp('<value>(.*?)</value>', 's').exec(xmlString);
  const labelMatch = new RegExp('<label>(.*?)</label>', 's').exec(xmlString);
  const frameIdMatch = new RegExp('<frameId>(.*?)</frameId>', 's').exec(xmlString);

  const ref = refMatch?.[1]?.trim();
  const value = valueMatch?.[1]?.trim();
  const label = labelMatch?.[1]?.trim();

  if (!ref || (value === undefined && label === undefined)) {
    return null;
  }

  return {
    ref,
    value,
    label,
    frameId: frameIdMatch?.[1]?.trim(),
  };
}