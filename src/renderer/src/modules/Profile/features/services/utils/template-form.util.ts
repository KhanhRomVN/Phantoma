import type { FieldDef, TwoFactorType } from '../../../shared/types';
import { TWO_FACTOR } from '../constants/service-catalog.constants';

export function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

export function isTwoFactorField(f: FieldDef, twoFactor: TwoFactorType[]): boolean {
  const n = f.name.trim().toLowerCase();
  return twoFactor.some((m) => TWO_FACTOR[m].field.name.toLowerCase() === n && TWO_FACTOR[m].field.kind === f.kind);
}
