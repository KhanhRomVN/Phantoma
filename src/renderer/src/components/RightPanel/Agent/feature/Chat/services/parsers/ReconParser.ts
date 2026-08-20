/**
 * ------------------------------------------------------------------
 * Recon Parser
 * ------------------------------------------------------------------
 * Parse XML tags từ AI response cho các recon tools.
 * Mỗi tool có một parse function riêng để extract params.
 *
 * Main functions:
 * - parseBack()          : Parse back tag
 * - parseClickElement()  : Parse click_element tag
 * - parseNavigate()      : Parse navigate tag
 * - parseScroll()        : Parse scroll tag
 * ------------------------------------------------------------------
 */

// ─── Functions ──────────────────────────────────────────────────────────
// ===== BackParser =====

export interface BackParams {
  tabId?: string;
  targetId?: string;
}

export function parseBack(xmlString: string): BackParams | null {
  const tabIdMatch = new RegExp('<tabId>(.*?)</tabId>', 's').exec(xmlString);
  const targetIdMatch = new RegExp('<targetId>(.*?)</targetId>', 's').exec(xmlString);

  return {
    tabId: tabIdMatch?.[1]?.trim(),
    targetId: targetIdMatch?.[1]?.trim(),
  };
}

// ===== ClickElementParser =====

export interface ClickElementParams {
  ref: string;
  tabId?: string;
  targetId?: string;
}

export function parseClickElement(xmlString: string): ClickElementParams | null {
  const refMatch = new RegExp('<ref>(.*?)</ref>', 's').exec(xmlString);
  const tabIdMatch = new RegExp('<tabId>(.*?)</tabId>', 's').exec(xmlString);
  const targetIdMatch = new RegExp('<targetId>(.*?)</targetId>', 's').exec(xmlString);

  const ref = refMatch?.[1]?.trim();
  if (!ref) {
    return null;
  }

  return {
    ref,
    tabId: tabIdMatch?.[1]?.trim(),
    targetId: targetIdMatch?.[1]?.trim(),
  };
}

// ===== CloseTabParser =====

export interface CloseTabParams {
  tabId: string;
  targetId?: string;
}

export function parseCloseTab(xmlString: string): CloseTabParams | null {
  const tabIdMatch = new RegExp('<tabId>(.*?)</tabId>', 's').exec(xmlString);
  const targetIdMatch = new RegExp('<targetId>(.*?)</targetId>', 's').exec(xmlString);

  const tabId = tabIdMatch?.[1]?.trim();
  if (!tabId) {
    return null;
  }

  return {
    tabId,
    targetId: targetIdMatch?.[1]?.trim(),
  };
}

// ===== CreateTabParser =====

export interface CreateTabParams {
  url?: string;
  targetId?: string;
}

export function parseCreateTab(xmlString: string): CreateTabParams | null {
  const urlMatch = new RegExp('<url>(.*?)</url>', 's').exec(xmlString);
  const targetIdMatch = new RegExp('<targetId>(.*?)</targetId>', 's').exec(xmlString);

  return {
    url: urlMatch?.[1]?.trim(),
    targetId: targetIdMatch?.[1]?.trim(),
  };
}

// ===== FillInputParser =====

export interface FillInputParams {
  ref: string;
  value: string;
  tabId?: string;
  targetId?: string;
}

export function parseFillInput(xmlString: string): FillInputParams | null {
  const refMatch = new RegExp('<ref>(.*?)</ref>', 's').exec(xmlString);
  const valueMatch = new RegExp('<value>(.*?)</value>', 's').exec(xmlString);
  const tabIdMatch = new RegExp('<tabId>(.*?)</tabId>', 's').exec(xmlString);
  const targetIdMatch = new RegExp('<targetId>(.*?)</targetId>', 's').exec(xmlString);

  const ref = refMatch?.[1]?.trim();
  const value = valueMatch?.[1]?.trim();

  if (!ref || value === undefined) {
    return null;
  }

  return {
    ref,
    value,
    tabId: tabIdMatch?.[1]?.trim(),
    targetId: targetIdMatch?.[1]?.trim(),
  };
}

// ===== ForwardParser =====

export interface ForwardParams {
  tabId?: string;
  targetId?: string;
}

export function parseForward(xmlString: string): ForwardParams | null {
  const tabIdMatch = new RegExp('<tabId>(.*?)</tabId>', 's').exec(xmlString);
  const targetIdMatch = new RegExp('<targetId>(.*?)</targetId>', 's').exec(xmlString);

  return {
    tabId: tabIdMatch?.[1]?.trim(),
    targetId: targetIdMatch?.[1]?.trim(),
  };
}

// ===== GetPageContentParser =====

export interface GetPageContentParams {
  tabId?: string;
  targetId?: string;
}

export function parseGetPageContent(xmlString: string): GetPageContentParams | null {
  const tabIdMatch = new RegExp('<tabId>(.*?)</tabId>', 's').exec(xmlString);
  const targetIdMatch = new RegExp('<targetId>(.*?)</targetId>', 's').exec(xmlString);

  return {
    tabId: tabIdMatch?.[1]?.trim(),
    targetId: targetIdMatch?.[1]?.trim(),
  };
}

// ===== ListElementsParser =====

export interface ListElementsParams {
  elementType?: string; // input, button, link, select, textarea
  tabId?: string;
  targetId?: string;
}

export function parseListElements(xmlString: string): ListElementsParams | null {
  const elementTypeMatch = new RegExp('<elementType>(.*?)</elementType>', 's').exec(xmlString);
  const tabIdMatch = new RegExp('<tabId>(.*?)</tabId>', 's').exec(xmlString);
  const targetIdMatch = new RegExp('<targetId>(.*?)</targetId>', 's').exec(xmlString);

  return {
    elementType: elementTypeMatch?.[1]?.trim(),
    tabId: tabIdMatch?.[1]?.trim(),
    targetId: targetIdMatch?.[1]?.trim(),
  };
}

// ===== ListTabsParser =====

export interface ListTabsParams {
  targetId?: string;
}

export function parseListTabs(xmlString: string): ListTabsParams | null {
  const targetIdMatch = new RegExp('<targetId>(.*?)</targetId>', 's').exec(xmlString);

  return {
    targetId: targetIdMatch?.[1]?.trim(),
  };
}

// ===== NavigateParser =====

export interface NavigateParams {
  url: string;
  tabId?: string;
  targetId?: string;
}

export function parseNavigate(xmlString: string): NavigateParams | null {
  const urlMatch = new RegExp('<url>(.*?)</url>', 's').exec(xmlString);
  const tabIdMatch = new RegExp('<tabId>(.*?)</tabId>', 's').exec(xmlString);
  const targetIdMatch = new RegExp('<targetId>(.*?)</targetId>', 's').exec(xmlString);

  const url = urlMatch?.[1]?.trim();
  if (!url) {
    return null;
  }

  return {
    url,
    tabId: tabIdMatch?.[1]?.trim(),
    targetId: targetIdMatch?.[1]?.trim(),
  };
}

// ===== PressKeyParser =====

export interface PressKeyParams {
  key: string;
  tabId?: string;
  targetId?: string;
}

export function parsePressKey(xmlString: string): PressKeyParams | null {
  const keyMatch = new RegExp('<key>(.*?)</key>', 's').exec(xmlString);
  const tabIdMatch = new RegExp('<tabId>(.*?)</tabId>', 's').exec(xmlString);
  const targetIdMatch = new RegExp('<targetId>(.*?)</targetId>', 's').exec(xmlString);

  const key = keyMatch?.[1]?.trim();
  if (!key) {
    return null;
  }

  return {
    key,
    tabId: tabIdMatch?.[1]?.trim(),
    targetId: targetIdMatch?.[1]?.trim(),
  };
}

// ===== ReloadParser =====

export interface ReloadParams {
  tabId?: string;
  targetId?: string;
}

export function parseReload(xmlString: string): ReloadParams | null {
  const tabIdMatch = new RegExp('<tabId>(.*?)</tabId>', 's').exec(xmlString);
  const targetIdMatch = new RegExp('<targetId>(.*?)</targetId>', 's').exec(xmlString);

  return {
    tabId: tabIdMatch?.[1]?.trim(),
    targetId: targetIdMatch?.[1]?.trim(),
  };
}

// ===== ScrollParser =====

export interface ScrollParams {
  direction: 'up' | 'down' | 'top' | 'bottom';
  amount?: number;
  tabId?: string;
  targetId?: string;
}

export function parseScroll(xmlString: string): ScrollParams | null {
  const directionMatch = new RegExp('<direction>(.*?)</direction>', 's').exec(xmlString);
  const amountMatch = new RegExp('<amount>(.*?)</amount>', 's').exec(xmlString);
  const tabIdMatch = new RegExp('<tabId>(.*?)</tabId>', 's').exec(xmlString);
  const targetIdMatch = new RegExp('<targetId>(.*?)</targetId>', 's').exec(xmlString);

  const direction = directionMatch?.[1]?.trim() as ScrollParams['direction'];
  if (!direction || !['up', 'down', 'top', 'bottom'].includes(direction)) {
    return null;
  }

  const amount = amountMatch?.[1]?.trim();

  return {
    direction,
    amount: amount ? parseInt(amount, 10) : undefined,
    tabId: tabIdMatch?.[1]?.trim(),
    targetId: targetIdMatch?.[1]?.trim(),
  };
}

// ===== SwitchTabParser =====

export interface SwitchTabParams {
  tabId: string;
  targetId?: string;
}

export function parseSwitchTab(xmlString: string): SwitchTabParams | null {
  const tabIdMatch = new RegExp('<tabId>(.*?)</tabId>', 's').exec(xmlString);
  const targetIdMatch = new RegExp('<targetId>(.*?)</targetId>', 's').exec(xmlString);

  const tabId = tabIdMatch?.[1]?.trim();
  if (!tabId) {
    return null;
  }

  return {
    tabId,
    targetId: targetIdMatch?.[1]?.trim(),
  };
}