// ============================================================================
// PHANTOMA WIRELESS — MAC Spoof Tab Types
// ============================================================================

export interface MacEntry {
  id: string;
  interface: string;
  originalMac: string;
  currentMac: string;
  spoofed: boolean;
  timestamp: string;
  reason: string;
}