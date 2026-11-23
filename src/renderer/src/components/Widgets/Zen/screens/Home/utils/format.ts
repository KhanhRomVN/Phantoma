/**
 * ------------------------------------------------------------------
 * Format utilities for Home feature
 * ------------------------------------------------------------------
 * Shared formatting functions and constants for Home dashboard cards.
 * ------------------------------------------------------------------
 */

export interface AccountStat {
  id: string;
  email: string;
  provider_id: string;
  total_tokens?: number;
  total_requests?: number;
}

export const ACCOUNT_COLORS = [
  'rgb(59, 130, 246)',   // blue
  'rgb(245, 158, 11)',   // amber
  'rgb(139, 92, 246)',   // violet
  'rgb(16, 185, 129)',   // emerald
  'rgb(244, 63, 94)',    // rose
];

export function formatTokens(v: number): string {
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return String(v);
}