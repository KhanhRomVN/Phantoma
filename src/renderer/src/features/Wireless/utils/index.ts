// ============================================================================
// PHANTOMA WIRELESS — Utility Functions
// ============================================================================

import React from 'react';
import type { Encryption } from '../types';
import { ENC_PALETTE, OUI_MAP } from '../constants';

export function encBadge(enc: Encryption): React.ReactElement {
  const p = ENC_PALETTE[enc];
  return React.createElement(
    'span',
    {
      style: {
        color: p.color,
        background: p.bg,
        border: `1px solid ${p.border}`,
        fontSize: 8,
        fontWeight: 700,
        padding: '2px 6px',
        borderRadius: 3,
        letterSpacing: '0.08em',
        fontFamily: 'inherit',
      },
    },
    enc.toUpperCase(),
  );
}

export function signalBar(dbm: number): React.ReactElement {
  const pct = Math.max(0, Math.min(100, ((dbm + 100) / 60) * 100));
  const color = dbm >= -55 ? 'var(--success)' : dbm >= -72 ? 'var(--warning)' : 'var(--error)';
  return React.createElement(
    'div',
    { style: { display: 'flex', alignItems: 'center', gap: 5 } },
    React.createElement(
      'span',
      { style: { color, fontSize: 10, fontWeight: 700, width: 36, textAlign: 'right' } },
      `${dbm}dBm`,
    ),
    React.createElement(
      'div',
      { style: { width: 38, height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' } },
      React.createElement('div', {
        style: {
          width: `${pct}%`,
          height: '100%',
          background: color,
          borderRadius: 2,
          transition: 'width 0.5s',
        },
      }),
    ),
  );
}

export function progressBar(pct: number, color = 'var(--primary)', h = 3): React.ReactElement {
  return React.createElement(
    'div',
    { style: { height: h, background: 'var(--border)', borderRadius: 2, overflow: 'hidden', flex: 1 } },
    React.createElement('div', {
      style: {
        width: `${pct}%`,
        height: '100%',
        background: color,
        borderRadius: 2,
        transition: 'width 0.8s ease',
      },
    }),
  );
}

export function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60),
    s = sec % 60;
  return `${m}m ${s < 10 ? '0' : ''}${s}s`;
}

export function fmtNum(n: number): string {
  return n.toLocaleString();
}

export function resolveVendor(mac: string): string {
  const prefix = mac.slice(0, 8).toUpperCase();
  return OUI_MAP[prefix] ?? 'Unknown Vendor';
}

/**
 * Convert dBm signal level to a human-readable quality label.
 */
export function signalLabel(dbm: number): string {
  if (dbm >= -50) return 'Excellent';
  if (dbm >= -60) return 'Good';
  if (dbm >= -70) return 'Fair';
  if (dbm >= -80) return 'Weak';
  return 'Very Weak';
}

/**
 * Calculate estimated crack time given a speed and keyspace.
 */
export function estimateCrackTime(keyspaceSize: number, keysPerSec: number): string {
  if (keysPerSec <= 0) return 'N/A';
  const sec = Math.floor(keyspaceSize / keysPerSec);
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ${sec % 60}s`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`;
  return `${Math.floor(sec / 86400)}d ${Math.floor((sec % 86400) / 3600)}h`;
}

/**
 * Determine if a network is considered high-risk based on its properties.
 */
export function isHighRisk(net: { encryption: Encryption; wps?: boolean; wpsVulnerable?: boolean; mfpEnabled?: boolean; crackProbability: number }): boolean {
  return (
    net.encryption === 'open' ||
    net.encryption === 'wep' ||
    (!!net.wps && !!net.wpsVulnerable) ||
    (!net.mfpEnabled && net.encryption !== 'wpa3') ||
    net.crackProbability >= 80
  );
}

/**
 * Severity tier for findings report.
 */
export function getSeverity(net: { encryption: Encryption; wpsVulnerable?: boolean; mfpEnabled?: boolean; crackProbability: number }): 'critical' | 'high' | 'medium' | 'low' | 'info' {
  if (net.encryption === 'open' || net.encryption === 'wep') return 'critical';
  if (net.wpsVulnerable) return 'high';
  if (!net.mfpEnabled) return 'medium';
  if (net.crackProbability >= 50) return 'medium';
  if (net.encryption === 'wpa') return 'low';
  return 'info';
}