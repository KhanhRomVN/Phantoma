import { BROWSER_CONTROL_TOOLS } from '../../prompts/browser-control/tools-reference';

export type BrowserToolParams = Record<string, string>;

/** Browser-control tool names handled via the emulate API (send_message is handled separately). */
export const BROWSER_TOOL_NAMES = BROWSER_CONTROL_TOOLS.filter((tool) => tool !== 'send_message');

/**
 * Parse a browser-control tool tag from AI response.
 * Format: <navigate><url>https://example.com</url></navigate> (each param is a child tag)
 */
export function parseBrowserTool(innerContent: string): BrowserToolParams {
  const params: BrowserToolParams = {};
  const re = /<(\w+)>([\s\S]*?)<\/\1>/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(innerContent)) !== null) {
    params[match[1]] = match[2].trim();
  }
  return params;
}

export const browserToolParsers: Record<string, (innerContent: string) => BrowserToolParams> =
  Object.fromEntries(BROWSER_TOOL_NAMES.map((tool) => [tool, parseBrowserTool]));