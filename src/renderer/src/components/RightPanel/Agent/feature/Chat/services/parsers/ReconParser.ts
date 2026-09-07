/**
 * ------------------------------------------------------------------
 * Recon Parser
 * ------------------------------------------------------------------
 * Parse XML tags từ AI response cho các recon tools.
 * Mỗi tool có một parse function riêng để extract params.
 *
 * Main functions:
 * - parseBack()               : Parse back tag
 * - parseCaptureScreenshot()  : Parse capture_screenshot tag
 * - parseClickElement()       : Parse click_element tag
 * - parseNavigate()           : Parse navigate tag
 * - parseScroll()             : Parse scroll tag
 * ------------------------------------------------------------------
 */

// ─── Functions ──────────────────────────────────────────────────────────
// ===== BackParser =====

export interface BackParams {
  // No params — acts on active tab
}

export function parseBack(_xmlString: string): BackParams | null {
  return {};
}

// ===== ClickElementParser =====

export interface ClickElementParams {
  ref: string;
  clickType?: 'single' | 'double' | 'right';
  frameId?: string;
}

export function parseClickElement(xmlString: string): ClickElementParams | null {
  const refMatch = new RegExp('<ref>(.*?)</ref>', 's').exec(xmlString);
  const clickTypeMatch = new RegExp('<clickType>(.*?)</clickType>', 's').exec(xmlString);
  const frameIdMatch = new RegExp('<frameId>(.*?)</frameId>', 's').exec(xmlString);

  const ref = refMatch?.[1]?.trim();
  if (!ref) {
    return null;
  }

  const clickTypeStr = clickTypeMatch?.[1]?.trim();

  return {
    ref,
    clickType: clickTypeStr as ClickElementParams['clickType'],
    frameId: frameIdMatch?.[1]?.trim(),
  };
}

// ===== CloseTabParser =====

export interface CloseTabParams {
  tabId: string;
}

export function parseCloseTab(xmlString: string): CloseTabParams | null {
  const tabIdMatch = new RegExp('<tabId>(.*?)</tabId>', 's').exec(xmlString);

  const tabId = tabIdMatch?.[1]?.trim();
  if (!tabId) {
    return null;
  }

  return {
    tabId,
  };
}

// ===== CreateTabParser =====

export interface CreateTabParams {
  url?: string;
}

export function parseCreateTab(xmlString: string): CreateTabParams | null {
  const urlMatch = new RegExp('<url>(.*?)</url>', 's').exec(xmlString);

  return {
    url: urlMatch?.[1]?.trim(),
  };
}

// ===== FillInputParser =====

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

// ===== ForwardParser =====

export interface ForwardParams {
  // No params — acts on active tab
}

export function parseForward(_xmlString: string): ForwardParams | null {
  return {};
}

// ===== GetPageContentParser =====

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

// ===== ListElementsParser =====

export interface ListElementsParams {
  elementType?: string; // input, button, link, select, textarea, checkbox, radio
  labelContains?: string;
  visibleOnly?: boolean;
  limit?: number;
  offset?: number;
}

export function parseListElements(xmlString: string): ListElementsParams | null {
  const elementTypeMatch = new RegExp('<elementType>(.*?)</elementType>', 's').exec(xmlString);
  const labelContainsMatch = new RegExp('<labelContains>(.*?)</labelContains>', 's').exec(xmlString);
  const visibleOnlyMatch = new RegExp('<visibleOnly>(.*?)</visibleOnly>', 's').exec(xmlString);
  const limitMatch = new RegExp('<limit>(.*?)</limit>', 's').exec(xmlString);
  const offsetMatch = new RegExp('<offset>(.*?)</offset>', 's').exec(xmlString);

  const limitStr = limitMatch?.[1]?.trim();
  const offsetStr = offsetMatch?.[1]?.trim();

  return {
    elementType: elementTypeMatch?.[1]?.trim(),
    labelContains: labelContainsMatch?.[1]?.trim(),
    visibleOnly: visibleOnlyMatch?.[1]?.trim() === 'true',
    limit: limitStr ? parseInt(limitStr, 10) : undefined,
    offset: offsetStr ? parseInt(offsetStr, 10) : undefined,
  };
}

// ===== ListTabsParser =====

export interface ListTabsParams {
  // No params — targetId is auto-resolved by executor
}

export function parseListTabs(_xmlString: string): ListTabsParams | null {
  return {};
}

// ===== NavigateParser =====

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

// ===== PressKeyParser =====

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

// ===== ReloadParser =====

export interface ReloadParams {
  // No params — acts on active tab
}

export function parseReload(_xmlString: string): ReloadParams | null {
  return {};
}

// ===== ScrollParser =====

export interface ScrollParams {
  direction: 'up' | 'down' | 'top' | 'bottom';
  amount?: number;
}

export function parseScroll(xmlString: string): ScrollParams | null {
  const directionMatch = new RegExp('<direction>(.*?)</direction>', 's').exec(xmlString);
  const amountMatch = new RegExp('<amount>(.*?)</amount>', 's').exec(xmlString);

  const direction = directionMatch?.[1]?.trim() as ScrollParams['direction'];
  if (!direction || !['up', 'down', 'top', 'bottom'].includes(direction)) {
    return null;
  }

  const amount = amountMatch?.[1]?.trim();

  return {
    direction,
    amount: amount ? parseInt(amount, 10) : undefined,
  };
}

// ===== SwitchTabParser =====

export interface SwitchTabParams {
  tabId: string;
}

export function parseSwitchTab(xmlString: string): SwitchTabParams | null {
  const tabIdMatch = new RegExp('<tabId>(.*?)</tabId>', 's').exec(xmlString);

  const tabId = tabIdMatch?.[1]?.trim();
  if (!tabId) {
    return null;
  }

  return {
    tabId,
  };
}

// ===== CaptureScreenshotParser =====

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

// ===== SelectOptionParser =====

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

// ===== EvaluateJsParser =====

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

// ===== UploadFileParser =====

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

// ===== ClearInputParser =====

export interface ClearInputParams {
  ref: string;
}

export function parseClearInput(xmlString: string): ClearInputParams | null {
  const refMatch = new RegExp('<ref>(.*?)</ref>', 's').exec(xmlString);

  const ref = refMatch?.[1]?.trim();
  if (!ref) {
    return null;
  }

  return {
    ref,
  };
}

// ===== HoverParser =====

export interface HoverParams {
  ref: string;
}

export function parseHover(xmlString: string): HoverParams | null {
  const refMatch = new RegExp('<ref>(.*?)</ref>', 's').exec(xmlString);

  const ref = refMatch?.[1]?.trim();
  if (!ref) {
    return null;
  }

  return {
    ref,
  };
}

// ===== ListFramesParser =====

export interface ListFramesParams {
  // No params — lists frames on active tab
}

export function parseListFrames(_xmlString: string): ListFramesParams | null {
  return {};
}

// ===== ScrollToElementParser =====

export interface ScrollToElementParams {
  ref: string;
}

export function parseScrollToElement(xmlString: string): ScrollToElementParams | null {
  const refMatch = new RegExp('<ref>(.*?)</ref>', 's').exec(xmlString);

  const ref = refMatch?.[1]?.trim();
  if (!ref) {
    return null;
  }

  return {
    ref,
  };
}

// ===== WaitForParser =====

export type WaitCondition = 'element_visible' | 'element_hidden' | 'text_present' | 'network_idle';

export interface WaitForParams {
  condition: WaitCondition;
  ref?: string;
  text?: string;
  timeoutMs?: number;
}

export function parseWaitFor(xmlString: string): WaitForParams | null {
  const conditionMatch = new RegExp('<condition>(.*?)</condition>', 's').exec(xmlString);
  const refMatch = new RegExp('<ref>(.*?)</ref>', 's').exec(xmlString);
  const textMatch = new RegExp('<text>(.*?)</text>', 's').exec(xmlString);
  const timeoutMsMatch = new RegExp('<timeoutMs>(.*?)</timeoutMs>', 's').exec(xmlString);

  const condition = conditionMatch?.[1]?.trim() as WaitCondition;
  if (!condition) {
    return null;
  }

  const timeoutMsStr = timeoutMsMatch?.[1]?.trim();

  return {
    condition,
    ref: refMatch?.[1]?.trim(),
    text: textMatch?.[1]?.trim(),
    timeoutMs: timeoutMsStr ? parseInt(timeoutMsStr, 10) : undefined,
  };
}