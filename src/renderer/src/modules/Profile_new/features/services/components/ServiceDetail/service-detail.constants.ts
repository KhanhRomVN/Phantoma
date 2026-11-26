import type { FieldKind, ServiceStatus } from '../../../../shared/types';
import { SERVICE_STATUS } from '../../constants/service-status.constants';

export const ICON_BTN =
  'flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-text-secondary/10 text-text-secondary transition-colors hover:bg-text-secondary/15 hover:text-text-primary';

export const BADGE =
  'inline-flex items-center gap-1.5 rounded-md bg-text-secondary/10 px-2 py-1 text-[11px] font-medium text-text-secondary';

export const STATUS_ORDER = Object.keys(SERVICE_STATUS) as ServiceStatus[];

export const is2fa = (kind: FieldKind): boolean => kind === 'totp' || kind === 'backup';
