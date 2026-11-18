import type { TotpSample } from '../types/totp.types';

export const TOTP_SAMPLE_NORMAL: TotpSample = { code: '482915', remaining: 22 };
export const TOTP_SAMPLE_LOW: TotpSample = { code: '730164', remaining: 3 };
export const TOTP_SAMPLE_EMPTY: TotpSample = { code: null, remaining: 30 };