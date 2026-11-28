import type { TwoFactorType } from '../../../../shared/types';

export const TWO_FACTOR_HINT: Record<TwoFactorType, string> = {
  totp: 'Stores the base32 secret and generates live codes',
  backup: 'Stores one-time recovery codes',
};
