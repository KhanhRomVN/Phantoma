// ============================================================================
// PHANTOMA WIRELESS — Shared Type Definitions
// ============================================================================

export type Encryption = 'open' | 'wep' | 'wpa' | 'wpa2' | 'wpa3' | 'enterprise';

export type AttackType =
  | 'handshake_capture'
  | 'deauth'
  | 'wps_pixie'
  | 'wps_bruteforce'
  | 'dictionary_crack'
  | 'pmkid'
  | 'evil_twin'
  | 'wpa3_sae'
  | 'enterprise_rogue'
  | 'krack'
  | 'mac_spoof';

export type AttackStatus = 'queued' | 'running' | 'completed' | 'failed' | 'stopped';

export type TabType = 'scan' | 'attacks' | 'evil_twin' | 'crack' | 'wpa3_ent' | 'mac' | 'log' | 'report';