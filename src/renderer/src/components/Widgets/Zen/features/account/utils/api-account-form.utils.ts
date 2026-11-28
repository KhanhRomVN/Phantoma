import { SENSITIVE_KEYS } from '../constants/api-account-form.constants';
import type { Values } from '../types/api-account.types';

export const presetKey = (p: { name: string; url: string }): string => `${p.name}|${p.url}`;

export const toValues = (config: Record<string, any> | null | undefined): Values => {
  const out: Values = {};
  for (const [k, v] of Object.entries(config ?? {})) {
    if (k === 'website' || k === 'models') continue;
    if (v !== null && v !== undefined && typeof v !== 'object') out[k] = String(v);
  }
  return out;
};

export const withoutSensitive = (values: Values): Values => {
  const out: Values = {};
  for (const [k, v] of Object.entries(values)) if (!SENSITIVE_KEYS.includes(k)) out[k] = v;
  return out;
};

export const onlySensitive = (values: Values): Values => {
  const out: Values = {};
  for (const [k, v] of Object.entries(values)) if (SENSITIVE_KEYS.includes(k)) out[k] = v;
  return out;
};
