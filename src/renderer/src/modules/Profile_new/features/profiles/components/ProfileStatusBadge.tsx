import { Pill } from '../../../shared/components/Pill';
import type { ProfileStatus } from '../../../shared/types';
import { PROFILE_STATUS } from '../constants/profile-status.constants';

export function ProfileStatusBadge({ status }: { status: ProfileStatus }) {
  const s = PROFILE_STATUS[status];
  return <Pill tone={s.tone}>{s.label}</Pill>;
}
