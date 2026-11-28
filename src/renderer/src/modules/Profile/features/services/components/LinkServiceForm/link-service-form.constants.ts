import type { ServiceStatus } from '../../../../shared/types';
import { SERVICE_STATUS } from '../../constants/service-status.constants';

export const STATUS_ORDER = Object.keys(SERVICE_STATUS) as ServiceStatus[];

export const BADGE =
  'inline-flex items-center gap-1.5 rounded-md bg-text-secondary/10 px-2 py-1 text-[11px] font-medium text-text-secondary';

export const STATUS_BORDER: Record<string, string> = {
  primary: 'border-primary/60',
  info: 'border-info/60',
  success: 'border-success/60',
  warn: 'border-warn/60',
  error: 'border-error/60',
  muted: 'border-text-secondary/40',
};

export const PRIMARY_BTN = 'rounded-md bg-primary/10 text-primary hover:bg-primary/20 active:bg-primary/30';

export const SOFT_BTN =
  'rounded-md bg-text-secondary/10 text-text-secondary hover:bg-text-secondary/15 hover:text-text-primary active:bg-text-secondary/20';

export const CATEGORY_LABEL = 'text-[10px] font-semibold uppercase tracking-wide text-text-secondary';
