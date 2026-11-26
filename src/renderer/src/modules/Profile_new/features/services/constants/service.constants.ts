import type { AuthMethod, FieldKind } from '../../../shared/types';
import type { ServiceCategory } from './service-category.constants';
import { SERVICE_ROWS_1 } from './service-rows/service-rows-1.constants';
import { SERVICE_ROWS_2 } from './service-rows/service-rows-2.constants';
import { SERVICE_ROWS_3 } from './service-rows/service-rows-3.constants';

// Mirrors the `services` table in profile/SCHEMA.md (+ optional category). Presets are templates only: they are never written to the table.
export interface ServicePresetField {
  name: string;
  kind: FieldKind;
  required?: boolean;
}

export interface ServicePreset {
  name: string;
  websiteUrl: string;
  category?: ServiceCategory;
  authMethods: AuthMethod[];
  customFields: ServicePresetField[];
}

type FieldDef = [string, FieldKind, boolean?];

// [name, host, auth codes: g=google a=apple f=facebook]
export type ServiceRow = [string, string, string?];
export type ServiceRows = Partial<Record<ServiceCategory, ServiceRow[]>>;

const toFields = (fields: FieldDef[]): ServicePresetField[] =>
  fields.map(([name, kind, required]) => ({ name, kind, required }));

const preset = (
  name: string,
  websiteUrl: string,
  category: ServiceCategory,
  authMethods: AuthMethod[],
  fields: FieldDef[],
): ServicePreset => ({ name, websiteUrl, category, authMethods, customFields: toFields(fields) });

const DETAILED: ServicePreset[] = [
  preset('Facebook', 'https://www.facebook.com', 'social', [], [
    ['UID', 'text', true],
    ['Page ID', 'text'],
    ['Ad account', 'text'],
    ['Cookie', 'secret'],
    ['TOTP secret', 'totp'],
    ['Backup codes', 'backup'],
  ]),
  preset('YouTube', 'https://www.youtube.com', 'video', ['google'], [
    ['Channel', 'text'],
    ['Subscribers', 'text'],
    ['Monetized', 'text'],
  ]),
  preset('TikTok', 'https://www.tiktok.com', 'video', ['google', 'apple', 'facebook'], [
    ['Handle', 'text'],
    ['Followers', 'text'],
    ['TikTok Shop', 'text'],
  ]),
  preset('Telegram', 'https://web.telegram.org', 'messaging', [], [
    ['Phone', 'text', true],
    ['Session', 'secret'],
  ]),
  preset('Discord', 'https://discord.com', 'messaging', ['apple'], [
    ['Tag', 'text'],
    ['Token', 'secret'],
    ['TOTP secret', 'totp'],
    ['Backup codes', 'backup'],
  ]),
  preset('GitHub', 'https://github.com', 'dev', ['google', 'apple'], [
    ['Username', 'text'],
    ['PAT', 'secret'],
    ['TOTP secret', 'totp'],
    ['Backup codes', 'backup'],
  ]),
  preset('Binance', 'https://www.binance.com', 'finance', ['google', 'apple'], [
    ['UID', 'text'],
    ['API key', 'api'],
    ['KYC', 'text'],
    ['TOTP secret', 'totp'],
  ]),
  preset('Shopee', 'https://shopee.vn', 'ecommerce', ['google', 'facebook', 'apple'], [
    ['Shop ID', 'text'],
    ['Rating', 'text'],
    ['Orders this month', 'text'],
  ]),
];

const DEFAULT_FIELDS: Record<ServiceCategory, FieldDef[]> = {
  social: [['Handle', 'text'], ['Followers', 'text'], ['Cookie', 'secret'], ['TOTP secret', 'totp']],
  video: [['Channel', 'text'], ['Subscribers', 'text'], ['TOTP secret', 'totp']],
  messaging: [['Phone', 'text'], ['Session', 'secret'], ['TOTP secret', 'totp']],
  dev: [['Username', 'text'], ['Token', 'secret'], ['TOTP secret', 'totp'], ['Backup codes', 'backup']],
  cloud: [['Account ID', 'text'], ['Access key', 'api'], ['TOTP secret', 'totp']],
  ai: [['Username', 'text'], ['API key', 'api'], ['Plan', 'text']],
  finance: [['UID', 'text'], ['API key', 'api'], ['KYC', 'text'], ['TOTP secret', 'totp']],
  ecommerce: [['Shop ID', 'text'], ['Rating', 'text'], ['Cookie', 'secret']],
  gaming: [['Username', 'text'], ['Level', 'text'], ['TOTP secret', 'totp'], ['Backup codes', 'backup']],
  music: [['Username', 'text'], ['Plan', 'text']],
  news: [['Username', 'text'], ['Subscription', 'text']],
  education: [['Username', 'text'], ['Plan', 'text']],
  travel: [['Member ID', 'text'], ['Loyalty tier', 'text']],
  productivity: [['Workspace', 'text'], ['API key', 'api'], ['TOTP secret', 'totp']],
  other: [['Username', 'text']],
};

const AUTH_CODE: Record<string, AuthMethod> = { g: 'google', a: 'apple', f: 'facebook' };

function fromRows(rows: ServiceRows): ServicePreset[] {
  const out: ServicePreset[] = [];
  for (const category of Object.keys(rows) as ServiceCategory[]) {
    for (const [name, host, auth = ''] of rows[category] ?? []) {
      out.push({
        name,
        websiteUrl: `https://${host}`,
        category,
        authMethods: [...auth].map((c) => AUTH_CODE[c]).filter((m): m is AuthMethod => !!m),
        customFields: toFields(DEFAULT_FIELDS[category]),
      });
    }
  }
  return out;
}

function dedupe(list: ServicePreset[]): ServicePreset[] {
  const seen = new Set<string>();
  return list.filter((p) => {
    const key = p.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export const SERVICE_PRESETS: ServicePreset[] = dedupe([
  ...DETAILED,
  ...fromRows(SERVICE_ROWS_1),
  ...fromRows(SERVICE_ROWS_2),
  ...fromRows(SERVICE_ROWS_3),
]);

export const SERVICE_URL: Record<string, string> = Object.fromEntries(
  SERVICE_PRESETS.map((p) => [p.name, p.websiteUrl]),
);