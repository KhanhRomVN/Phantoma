import { ToolCategory } from '../types';

export const CATEGORY_META: Record<
  ToolCategory,
  { color: string; glow: string; bg: string; label: string }
> = {
  Network: {
    color: '#00e5ff',
    glow: 'rgba(0,229,255,0.15)',
    bg: 'rgba(0,229,255,0.06)',
    label: 'NET',
  },
  Web: {
    color: '#a78bfa',
    glow: 'rgba(167,139,250,0.15)',
    bg: 'rgba(167,139,250,0.06)',
    label: 'WEB',
  },
  Exploit: {
    color: '#ff4d6d',
    glow: 'rgba(255,77,109,0.15)',
    bg: 'rgba(255,77,109,0.06)',
    label: 'EXP',
  },
  OSINT: {
    color: '#34d399',
    glow: 'rgba(52,211,153,0.15)',
    bg: 'rgba(52,211,153,0.06)',
    label: 'INT',
  },
  Vuln: {
    color: '#fbbf24',
    glow: 'rgba(251,191,36,0.15)',
    bg: 'rgba(251,191,36,0.06)',
    label: 'VUL',
  },
};

export const SPEED_META = {
  fast: { label: 'FAST', color: '#34d399' },
  medium: { label: 'MED', color: '#fbbf24' },
  slow: { label: 'SLOW', color: '#fb7185' },
};

export const STATUS_META = {
  stable: { label: 'STABLE', color: '#34d399' },
  beta: { label: 'BETA', color: '#fbbf24' },
  experimental: { label: 'EXPRMTL', color: '#fb7185' },
};