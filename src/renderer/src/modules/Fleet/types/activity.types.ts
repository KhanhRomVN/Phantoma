import type { LucideIcon } from 'lucide-react';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'success';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  deviceId: string;
  message: string;
}

export interface ActivityEvent {
  timestamp: string;
  icon: LucideIcon;
  color: string;
  deviceId: string;
  text: string;
}