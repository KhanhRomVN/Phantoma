export type Tone = 'success' | 'error' | 'warn' | 'info' | 'primary' | 'muted';

export const TONE_CLASS: Record<Tone, { pill: string; dot: string; icon: string; bg: string }> = {
  success: {
    pill: 'bg-success/10 text-success',
    dot: 'bg-success',
    icon: 'bg-success/10 text-success',
    bg: 'bg-success/5',
  },
  error: {
    pill: 'bg-error/10 text-error',
    dot: 'bg-error',
    icon: 'bg-error/10 text-error',
    bg: 'bg-error/5',
  },
  warn: {
    pill: 'bg-warn/10 text-warn',
    dot: 'bg-warn',
    icon: 'bg-warn/10 text-warn',
    bg: 'bg-warn/5',
  },
  info: {
    pill: 'bg-info/10 text-info',
    dot: 'bg-info',
    icon: 'bg-info/10 text-info',
    bg: 'bg-info/5',
  },
  primary: {
    pill: 'bg-primary/10 text-primary',
    dot: 'bg-primary',
    icon: 'bg-primary/10 text-primary',
    bg: 'bg-primary/5',
  },
  muted: {
    pill: 'bg-text-secondary/10 text-text-secondary',
    dot: 'bg-text-secondary',
    icon: 'bg-text-secondary/10 text-text-secondary',
    bg: 'bg-text-secondary/5',
  },
};

export const TAG_TONES: Tone[] = ['primary', 'info', 'success', 'warn'];

export function hashTone(key: string): Tone {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return TAG_TONES[h % TAG_TONES.length];
}