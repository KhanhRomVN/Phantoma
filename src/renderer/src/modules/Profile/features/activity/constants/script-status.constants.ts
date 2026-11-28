import type { ScriptStatus } from '../../../shared/types';
import type { Tone } from '../../../shared/types/ui.types';

export const SCRIPT_STATUS: Record<ScriptStatus, { label: string; tone: Tone }> = {
  success: { label: 'Success', tone: 'success' },
  failed: { label: 'Failed', tone: 'error' },
  running: { label: 'Running', tone: 'info' },
  cancelled: { label: 'Cancelled', tone: 'muted' },
};
