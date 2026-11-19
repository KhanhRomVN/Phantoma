import {
  TOTP_DIGIT_COUNT,
  TOTP_LOW_THRESHOLD,
  TOTP_PERIOD,
  TOTP_PLACEHOLDER_CHAR,
} from '../constants/totp';

export function getTotpDigits(code: string | null): string[] {
  return (code ?? '').padEnd(TOTP_DIGIT_COUNT, TOTP_PLACEHOLDER_CHAR).split('');
}

export function getTotpPercent(remaining: number): number {
  return (remaining / TOTP_PERIOD) * 100;
}

export function isTotpLow(remaining: number): boolean {
  return remaining <= TOTP_LOW_THRESHOLD;
}