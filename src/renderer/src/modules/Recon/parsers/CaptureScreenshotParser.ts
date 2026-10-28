export interface CaptureScreenshotParams {
  fullPage?: boolean;
  frameId?: string;
}

export function parseCaptureScreenshot(xmlString: string): CaptureScreenshotParams | null {
  const fullPageMatch = new RegExp('<fullPage>(.*?)</fullPage>', 's').exec(xmlString);
  const frameIdMatch = new RegExp('<frameId>(.*?)</frameId>', 's').exec(xmlString);

  return {
    fullPage: fullPageMatch?.[1]?.trim() === 'true',
    frameId: frameIdMatch?.[1]?.trim(),
  };
}