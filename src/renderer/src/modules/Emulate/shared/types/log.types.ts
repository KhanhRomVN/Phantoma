/**
 * Type definitions cho log viewer trong module Emulate.
 * Bao gồm log entry, filter state và các constant màu sắc hiển thị.
 */

export type LogLevel = 'V' | 'D' | 'I' | 'W' | 'E' | 'F';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  tag: string;
  pid: string;
  message: string;
  raw: string;
}
