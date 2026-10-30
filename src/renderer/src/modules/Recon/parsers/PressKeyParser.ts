export interface PressKeyParams {
  key: string;
}

export function parsePressKey(xmlString: string): PressKeyParams | null {
  const keyMatch = new RegExp('<key>(.*?)</key>', 's').exec(xmlString);

  const key = keyMatch?.[1]?.trim();
  if (!key) {
    return null;
  }

  return {
    key,
  };
}