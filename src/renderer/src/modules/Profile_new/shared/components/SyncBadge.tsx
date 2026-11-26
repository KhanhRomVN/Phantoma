import type { SyncState } from '../types';
import { SYNC_STATUS } from '../constants/sync-status.constants';
import { Pill } from './Pill';

export function SyncBadge({ state }: { state: SyncState }) {
  const s = SYNC_STATUS[state];
  return <Pill tone={s.tone}>{s.label}</Pill>;
}
