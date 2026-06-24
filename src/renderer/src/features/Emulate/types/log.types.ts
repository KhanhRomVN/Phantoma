// Log viewer types
export type LogLevel = 'V' | 'D' | 'I' | 'W' | 'E' | 'F';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  tag: string;
  pid: string;
  message: string;
  raw: string;
}

export interface LogFilterState {
  levels: Record<LogLevel, boolean>;
  searchTerm: string;
  matchCase: boolean;
  matchWholeWord: boolean;
  useRegex: boolean;
  hiddenTags: Set<string>;
  selectedPackages: Set<string>;
}

export const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  V: 'text-zinc-500',
  D: 'text-slate-400',
  I: 'text-cyan-400',
  W: 'text-amber-400',
  E: 'text-red-400',
  F: 'text-red-400',
};

export const LOG_LEVEL_BG_COLORS: Record<LogLevel, string> = {
  V: 'bg-zinc-500/5',
  D: 'bg-slate-500/5',
  I: 'bg-cyan-500/5',
  W: 'bg-amber-500/5',
  E: 'bg-red-500/5',
  F: 'bg-red-500/5',
};

export const LOG_LEVEL_LABELS: Record<LogLevel, string> = {
  V: 'Verbose',
  D: 'Debug',
  I: 'Info',
  W: 'Warning',
  E: 'Error',
  F: 'Fatal',
};

export interface LogViewerProps {
  emulatorSerial?: string;
  onClose?: () => void;
}