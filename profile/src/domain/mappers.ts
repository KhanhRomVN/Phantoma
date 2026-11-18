export type Row = Record<string, any>;

import { fromEmailId } from '../utils/browser-folder';

const iso = (ms: number | null | undefined): string => (ms ? new Date(ms).toISOString() : '');

function parse<T>(text: string | null | undefined, fallback: T): T {
  if (!text) return fallback;
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

export const mapSource = (r: Row) => ({
  id: r.id as string,
  name: r.name as string,
  type: r.type as string,
  browsers: parse<string[]>(r.browsers, []),
  description: r.description as string,
  location: (r.location ?? undefined) as string | undefined,
  count: (r.count ?? 0) as number,
  lastSync: iso(r.last_sync),
  online: r.online === 1,
});

// <profile dir>/email.json: only these fields are stored
export interface EmailFile {
  email: string;
  display_name: string;
  avatar_hue: number;
  avatar_url: string | null;
  recovery_email: string | null;
  phone_number: string | null;
  totp: string | null;
  password?: string | null;
  status?: string | null;
  status_note?: string | null;
  backup_codes: { code: string; used: boolean }[];
  created_at: string;
  updated_at: string;
}

// ASSUMED: fields that email.json no longer stores (source, group, status, notes...) get fixed defaults so the renderer's Profile type still fits
export const mapEmail = (id: string, f: EmailFile) => ({
  id,
  sourceId: fromEmailId(id)?.sourceId ?? '',
  email: f.email,
  displayName: f.display_name ?? '',
  avatarHue: f.avatar_hue ?? 0,
  avatarUrl: (f.avatar_url ?? null) as string | null,
  recoveryEmail: (f.recovery_email ?? null) as string | null,
  phone: (f.phone_number ?? null) as string | null,
  totpEnabled: !!f.totp,
  totpSecret: (f.totp ?? null) as string | null,
  backupCodes: f.backup_codes ?? [],
  password: (f.password ?? null) as string | null,
  hasPassword: !!f.password,
  passwordStrength: 'medium',
  passwordReused: false,
  group: '',
  purpose: '',
  status: (f.status ?? 'active') as string,
  statusNote: (f.status_note ?? undefined) as string | undefined,
  chromeSync: 'unsynced',
  chromeProfile: (fromEmailId(id)?.folder ?? null) as string | null,
  createdAt: f.created_at ?? '',
  lastActive: '',
  notes: '',
});

// ASSUMED: API keeps url/fields/twoFactor/builtin for the renderer; the table stores website_url/custom_fields only
export const mapService = (r: Row) => ({
  id: r.id as string,
  name: r.name as string,
  url: (r.website_url ?? '') as string,
  authMethods: parse<string[]>(r.auth_methods, []),
  twoFactor: parse<{ kind: string }[]>(r.custom_fields, []).map((f) => f.kind).filter((k, i, a) => (k === 'totp' || k === 'backup') && a.indexOf(k) === i),
  fields: parse<unknown[]>(r.custom_fields, []),
  category: (r.category ?? undefined) as string | undefined,
  builtin: false,
});

// ASSUMED: name comes from the linked service; username/linkedAt are no longer stored
export const mapServiceEmail = (r: Row, serviceName: string) => ({
  id: r.id as string,
  name: serviceName,
  status: (r.status ?? 'active') as string,
  statusNote: (r.status_note ?? undefined) as string | undefined,
  linkedAt: '',
  templateId: (r.service_id ?? undefined) as string | undefined,
  authMethods: parse<string[]>(r.auth_methods, []),
  totps: parse<string[]>(r.totps, []),
  backupCodes: parse<unknown[]>(r.backup_codes, []),
  customFields: parse<{ name: string; value: string }[]>(r.custom_fields, []).map((f) => ({ key: f.name, value: f.value })),
});

// one browser run: [startedAt, endedAt] in UTC ISO (endedAt null = still running), plus the IP info and device footprint seen
export const mapSession = (r: Row) => ({
  id: r.id as string,
  browser: r.browser as string,
  startedAt: iso(r.started_at),
  endedAt: r.ended_at ? iso(r.ended_at) : null,
  ip: parse<Record<string, unknown> | null>(r.ip, null),
  footprint: parse<Record<string, unknown> | null>(r.footprint, null),
  sites: parse<unknown[]>(r.sites, []),
});