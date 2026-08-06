// localStorage keys used across Emulate feature
export const STORAGE_KEYS = {
  // Repeater storage
  REPEATER_PAYLOADS: 'repeater-payloads',
  REPEATER_HISTORY: 'repeater-history',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

export function getRepeaterStorageKey(targetId: string, suffix: string): string {
  const base = targetId ? `repeater-${targetId}` : 'repeater-default';
  return `${base}${suffix}`;
}

export function getPayloadStorageKey(
  targetId: string,
  payloadName: string,
  type: 'files' | 'scripts',
): string {
  const base = targetId ? `repeater-${targetId}` : 'repeater-default';
  return `${base}-${payloadName}-${type}`;
}
