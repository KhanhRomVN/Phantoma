export interface CreateTabParams {
  url?: string;
}

export function parseCreateTab(xmlString: string): CreateTabParams | null {
  const urlMatch = new RegExp('<url>(.*?)</url>', 's').exec(xmlString);

  return {
    url: urlMatch?.[1]?.trim(),
  };
}