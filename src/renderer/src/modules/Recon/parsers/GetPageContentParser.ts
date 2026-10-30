export interface GetPageContentParams {
  maxChars?: number;
}

export function parseGetPageContent(xmlString: string): GetPageContentParams | null {
  const maxCharsMatch = new RegExp('<maxChars>(.*?)</maxChars>', 's').exec(xmlString);
  const maxCharsStr = maxCharsMatch?.[1]?.trim();

  return {
    maxChars: maxCharsStr ? parseInt(maxCharsStr, 10) : undefined,
  };
}