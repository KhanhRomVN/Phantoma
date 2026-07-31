// ============================================================================
// PHANTOMA WIRELESS — Constants & Lookup Tables
// ============================================================================

import { $ } from '@renderer/utils/color';
import type { Encryption, AttackType, AttackStatus, CrackJob } from '../types';

export const ENC_PALETTE: Record<Encryption, { color: string; bg: string; border: string }> = {
  open: { color: $('--success'), bg: '#34d39910', border: '#34d39930' },
  wep: { color: $('--error'), bg: '#ef444410', border: '#ef444440' },
  wpa: { color: $('--warning'), bg: '#f9731610', border: '#f9731630' },
  wpa2: { color: $('--primary'), bg: '#3686ff10', border: '#3686ff30' },
  wpa3: { color: '#a78bfa', bg: '#a78bfa10', border: '#a78bfa30' },
  enterprise: { color: $('--warning'), bg: '#fbbf2410', border: '#fbbf2430' },
};

export const STATUS_STYLE: Record<AttackStatus, { color: string; label: string; dot?: string }> = {
  queued: { color: $('--text-secondary'), label: '◌ QUEUED', dot: $('--text-secondary') },
  running: { color: $('--success'), label: '● RUNNING', dot: $('--success') },
  completed: { color: $('--primary'), label: '✓ DONE', dot: $('--primary') },
  failed: { color: $('--error'), label: '✗ FAILED', dot: $('--error') },
  stopped: { color: $('--warning'), label: '■ STOPPED', dot: $('--warning') },
};

export const ATK_LABEL: Record<AttackType, string> = {
  handshake_capture: '📡 Handshake Capture',
  deauth: '⚡ Deauth Flood',
  wps_pixie: '🔓 WPS Pixie Dust',
  wps_bruteforce: '🔑 WPS Bruteforce',
  dictionary_crack: '📖 Dictionary Crack',
  pmkid: '🧬 PMKID Attack',
  evil_twin: '🎭 Evil Twin AP',
  wpa3_sae: '🛡 WPA3-SAE Crack',
  enterprise_rogue: '🏢 Rogue RADIUS AP',
  krack: '💀 KRACK Attack',
  mac_spoof: '🎭 MAC Spoof',
};

export const CRACK_MODE_COLORS: Record<CrackJob['mode'], string> = {
  dictionary: $('--primary'),
  bruteforce: $('--error'),
  pmkid: $('--accent-purple') || '#a78bfa',
  wep: $('--warning'),
  sae: $('--accent-purple') || '#a78bfa',
  ntlm: $('--warning'),
};

/**
 * Well-known IEEE OUI prefix to vendor mapping (abbreviated).
 * Used to enrich captured MAC addresses with manufacturer info.
 */
export const OUI_MAP: Record<string, string> = {
  'F0:1F:AF': 'Apple Inc.',
  '4C:32:75': 'Samsung Electronics',
  'DC:A6:32': 'Raspberry Pi Foundation',
  'DE:AD:BE': 'Phantom (spoofed)',
  'AA:BB:CC': 'Mock AP (test)',
  'B8:27:EB': 'Raspberry Pi Foundation',
  'AC:BC:32': 'Google LLC',
  '90:B0:ED': 'Dell Inc.',
  'A4:C3:F0': 'Lenovo Group',
  '58:FB:84': 'Cisco Systems',
  '00:50:56': 'VMware Inc.',
};

export const SEVERITY_COLORS: Record<string, string> = {
  critical: $('--error'),
  high: $('--warning'),
  medium: $('--warning'),
  low: $('--primary'),
  info: $('--text-secondary'),
};
