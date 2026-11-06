export const TOOL_ACTION_TYPES = {
  ACCEPT: 'accept',
  REJECT: 'reject',
} as const;

export const TERMINAL_STATUS = {
  RUNNING: 'running',
} as const;

export type TerminalStatus = (typeof TERMINAL_STATUS)[keyof typeof TERMINAL_STATUS];