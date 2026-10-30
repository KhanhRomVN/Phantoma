export interface NavigateParams {
  url: string;
  waitUntil?: 'domcontentloaded' | 'load' | 'networkidle';
  timeoutMs?: number;
}

export function parseNavigate(xmlString: string): NavigateParams | null {
  const urlMatch = new RegExp('<url>(.*?)</url>', 's').exec(xmlString);
  const waitUntilMatch = new RegExp('<waitUntil>(.*?)</waitUntil>', 's').exec(xmlString);
  const timeoutMsMatch = new RegExp('<timeoutMs>(.*?)</timeoutMs>', 's').exec(xmlString);

  const url = urlMatch?.[1]?.trim();
  if (!url) {
    return null;
  }

  const waitUntilStr = waitUntilMatch?.[1]?.trim();
  const timeoutMsStr = timeoutMsMatch?.[1]?.trim();

  return {
    url,
    waitUntil: waitUntilStr as NavigateParams['waitUntil'],
    timeoutMs: timeoutMsStr ? parseInt(timeoutMsStr, 10) : undefined,
  };
}