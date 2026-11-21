import type { Tone } from '../types';

export interface ToneClasses {
  text: string;
  bg: string;
  soft: string;
  line: string;
  border: string;
  ring: string;
}

export const TONE: Record<Tone, ToneClasses> = {
  primary: {
    text: 'text-primary',
    bg: 'bg-primary',
    soft: 'bg-primary/15',
    line: 'border-primary/30',
    border: 'border-primary',
    ring: 'ring-primary',
  },
  success: {
    text: 'text-success',
    bg: 'bg-success',
    soft: 'bg-success/15',
    line: 'border-success/30',
    border: 'border-success',
    ring: 'ring-success',
  },
  error: {
    text: 'text-error',
    bg: 'bg-error',
    soft: 'bg-error/15',
    line: 'border-error/30',
    border: 'border-error',
    ring: 'ring-error',
  },
  warn: {
    text: 'text-warn',
    bg: 'bg-warn',
    soft: 'bg-warn/15',
    line: 'border-warn/30',
    border: 'border-warn',
    ring: 'ring-warn',
  },
  info: {
    text: 'text-info',
    bg: 'bg-info',
    soft: 'bg-info/15',
    line: 'border-info/30',
    border: 'border-info',
    ring: 'ring-info',
  },
  muted: {
    text: 'text-text-secondary',
    bg: 'bg-text-secondary',
    soft: 'bg-text-secondary/15',
    line: 'border-text-secondary/30',
    border: 'border-text-secondary',
    ring: 'ring-text-secondary',
  },
};