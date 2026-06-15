export const STORAGE_KEYS = {
  // Target management
  EMULATE_TABS: 'phantoma-emulate-tabs',
  EMULATE_ACTIVE_TAB: 'phantoma-emulate-active-tab',

  // Fuzzer
  FUZZER_JOBS: 'systema-fuzzer-jobs',

  // Compare
  COMPARE_SAVED: 'systema-compares-global',

  // Collections
  COLLECTIONS: 'phantoma-collections',

  // Settings
  EMULATE_SETTINGS: 'phantoma-emulate-settings',
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];