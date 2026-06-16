// ============================================================================
// Scan constants — Filter types and configurations
// ============================================================================

export const SCAN_FILTERS = [
  { id: 'all', label: 'ALL', color: 'var(--primary)' },
  { id: 'open', label: 'OPEN', color: '#34d399' },
  { id: 'wep', label: 'WEP', color: '#ef4444' },
  { id: 'wpa', label: 'WPA', color: '#f97316' },
  { id: 'wpa2', label: 'WPA2', color: '#3686ff' },
  { id: 'wpa3', label: 'WPA3', color: '#a78bfa' },
  { id: 'enterprise', label: 'ENTERPRISE', color: '#fbbf24' },
] as const;

export type ScanFilterId = typeof SCAN_FILTERS[number]['id'];