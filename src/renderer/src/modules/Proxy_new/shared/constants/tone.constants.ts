import type { Tone } from '../types/proxy-domain.types';

export const TONE_CLASS: Record<Tone, { pill: string; dot: string; icon: string; bar: string; text: string }> = {
  success: { pill: 'bg-success/10 text-success', dot: 'bg-success', icon: 'bg-success/10 text-success', bar: 'bg-success', text: 'text-success' },
  error: { pill: 'bg-error/10 text-error', dot: 'bg-error', icon: 'bg-error/10 text-error', bar: 'bg-error', text: 'text-error' },
  warn: { pill: 'bg-warn/10 text-warn', dot: 'bg-warn', icon: 'bg-warn/10 text-warn', bar: 'bg-warn', text: 'text-warn' },
  info: { pill: 'bg-info/10 text-info', dot: 'bg-info', icon: 'bg-info/10 text-info', bar: 'bg-info', text: 'text-info' },
  primary: { pill: 'bg-primary/10 text-primary', dot: 'bg-primary', icon: 'bg-primary/10 text-primary', bar: 'bg-primary', text: 'text-primary' },
  muted: {
    pill: 'bg-text-secondary/10 text-text-secondary',
    dot: 'bg-text-secondary',
    icon: 'bg-text-secondary/10 text-text-secondary',
    bar: 'bg-text-secondary',
    text: 'text-text-secondary',
  },
};
