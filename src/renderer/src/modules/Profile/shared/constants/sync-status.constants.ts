import type { SyncState } from '../types';
import type { Tone } from '../types/ui.types';

export const SYNC_STATUS: Record<SyncState, { label: string; tone: Tone }> = {
  synced: { label: 'Synced', tone: 'success' },
  unsynced: { label: 'Not synced', tone: 'warn' },
  error: { label: 'Sync error', tone: 'error' },
};
