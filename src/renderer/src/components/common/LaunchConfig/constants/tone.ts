import type { Tone } from '../types';

export const TONE_CLASS: Record<Tone, { pill: string; dot: string; icon: string }> = {
  success: { pill: 'bg-success/10 text-success', dot: 'bg-success', icon: 'bg-success/10 text-success' },
  error: { pill: 'bg-error/10 text-error', dot: 'bg-error', icon: 'bg-error/10 text-error' },
  warn: { pill: 'bg-warn/10 text-warn', dot: 'bg-warn', icon: 'bg-warn/10 text-warn' },
  info: { pill: 'bg-info/10 text-info', dot: 'bg-info', icon: 'bg-info/10 text-info' },
  primary: { pill: 'bg-primary/10 text-primary', dot: 'bg-primary', icon: 'bg-primary/10 text-primary' },
  muted: {
    pill: 'bg-text-secondary/10 text-text-secondary',
    dot: 'bg-text-secondary',
    icon: 'bg-text-secondary/10 text-text-secondary',
  },
};

export const TAG_TONES: Tone[] = ['primary', 'info', 'success', 'warn'];