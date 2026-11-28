import type { PasswordStrength } from '../../../../../shared/types';
import type { Tone } from '../../../../../shared/types/ui.types';

export const STRENGTH: Record<PasswordStrength, { tone: Tone; label: string; level: number }> = {
  weak: { tone: 'error', label: 'Weak', level: 0 },
  medium: { tone: 'warn', label: 'Medium', level: 1 },
  strong: { tone: 'success', label: 'Strong', level: 2 },
};

export const BACKUP_TONES: Tone[] = ['primary', 'info', 'success', 'warn', 'error'];

export const INPUT =
  'h-10 w-full rounded-lg bg-input-background px-3 text-sm text-text-primary outline-none transition-colors placeholder:text-text-secondary/50';

export const INPUT_ERROR = 'border border-dashed border-error';

export const ICON_BTN =
  'flex h-7 w-7 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-text-secondary/15 hover:text-text-primary';
