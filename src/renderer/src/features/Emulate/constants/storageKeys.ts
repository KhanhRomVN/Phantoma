// localStorage keys used across Emulate feature
export const STORAGE_KEYS = {
  // Module persistence
  EMULATE_STATE: 'emulate-state',
  
  // Repeater storage
  REPEATER_PAYLOADS: 'repeater-payloads',
  REPEATER_HISTORY: 'repeater-history',
  REPEATER_FILTER: 'repeater-filter',
  
  // Filter storage (per target)
  REPEATER_FILTER_BASE: 'repeater-',
  REPEATER_FILTER_SUFFIX: '-filter',
  
  // Payload value storage (per target per payload)
  REPEATER_PAYLOAD_FILES: '-files',
  REPEATER_PAYLOAD_SCRIPTS: '-scripts',
  
  // Fuzzer storage
  FUZZER_JOBS: 'systema-fuzzer-jobs',
  
  // Compare storage
  COMPARE_SAVED: 'systema-compares-global',
  
  // Target tabs (per target)
  EMULATE_ACTIVE_TARGETS: 'emulate-active-targets',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

export function getRepeaterStorageKey(targetId: string, suffix: string): string {
  const base = targetId ? `repeater-${targetId}` : 'repeater-default';
  return `${base}${suffix}`;
}

export function getPayloadStorageKey(targetId: string, payloadName: string, type: 'files' | 'scripts'): string {
  const base = targetId ? `repeater-${targetId}` : 'repeater-default';
  return `${base}-${payloadName}-${type}`;
}