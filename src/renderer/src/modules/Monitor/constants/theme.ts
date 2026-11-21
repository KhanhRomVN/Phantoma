import type { Density, SourceType } from '../types/monitor.types';

export const THEME: Record<string, string> = {
  primary: '139,109,255',
  success: '52,211,153',
  error: '244,63,94',
  warn: '251,191,36',
  info: '34,211,238',
  bg: '7,7,13',
  tp: '244,244,251',
  ts: '154,154,184',
  border: '38,38,58',
  card: '15,15,26',
  cardHover: '23,23,40',
  input: '15,15,26',
  dropdown: '17,17,29',
  dropHover: '26,26,45',
  tooltip: '23,23,40',
  panel: '10,10,18',
  thead: '15,15,26',
  rowHover: '23,23,40',
};

export const ACCENTS = [
  '139,109,255',
  '34,211,238',
  '244,114,182',
  '52,211,153',
  '251,191,36',
  '244,63,94',
  '96,165,250',
  '251,146,60',
];

export const TONES: Record<string, string> = {
  success: 'success',
  error: 'error',
  warn: 'warn',
  info: 'info',
  primary: 'primary',
  muted: 'ts',
};

export const DENS: Record<Density, string> = { compact: '9px', cozy: '14px', spacious: '20px' };

export const SRC_ACCENT: Record<SourceType, string> = {
  reddit: '251,146,60',
  hackernews: '249,115,22',
  lobsters: '244,63,94',
  devto: '226,232,240',
  medium: '52,211,153',
  stackoverflow: '251,191,36',
};

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];