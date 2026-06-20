/**
 * Utility functions for preload
 */

export function safeStringify(obj: any): string {
  try {
    return JSON.stringify(obj);
  } catch {
    return String(obj);
  }
}

export function parseJSONSafely<T>(str: string): T | null {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}