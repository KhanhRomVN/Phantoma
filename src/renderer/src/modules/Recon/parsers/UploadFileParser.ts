export interface UploadFileParams {
  ref: string;
  filePath: string;
}

export function parseUploadFile(xmlString: string): UploadFileParams | null {
  const refMatch = new RegExp('<ref>(.*?)</ref>', 's').exec(xmlString);
  const filePathMatch = new RegExp('<filePath>(.*?)</filePath>', 's').exec(xmlString);

  const ref = refMatch?.[1]?.trim();
  const filePath = filePathMatch?.[1]?.trim();

  if (!ref || !filePath) {
    return null;
  }

  return {
    ref,
    filePath,
  };
}