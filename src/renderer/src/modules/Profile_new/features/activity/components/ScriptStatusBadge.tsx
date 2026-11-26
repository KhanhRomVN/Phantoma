import { Pill } from '../../../shared/components/Pill';
import type { ScriptStatus } from '../../../shared/types';
import { SCRIPT_STATUS } from '../constants/script-status.constants';

export function ScriptStatusBadge({ status }: { status: ScriptStatus }) {
  const s = SCRIPT_STATUS[status];
  return <Pill tone={s.tone}>{s.label}</Pill>;
}
