export interface EvaluateJsParams {
  script: string;
}

export function parseEvaluateJs(xmlString: string): EvaluateJsParams | null {
  const scriptMatch = new RegExp('<script>(.*?)</script>', 's').exec(xmlString);

  const script = scriptMatch?.[1]?.trim();
  if (!script) {
    return null;
  }

  return {
    script,
  };
}