import type { CustomField, FieldKind, ServiceLink, ServiceTemplate } from '../../../shared/types';
import { isBase32, normalizeBase32 } from '../../security';
import { FIELD_KINDS } from '../constants/service-catalog.constants';

export function normalizeUrl(input: string): string {
  const v = input.trim();
  if (!v) return '';
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(v) ? v : `https://${v}`;
}

export function isValidUrl(input: string): boolean {
  if (!input.trim()) return true;
  try {
    return new URL(normalizeUrl(input)).hostname.includes('.');
  } catch {
    return false;
  }
}

export function hostOf(url: string): string {
  try {
    return new URL(normalizeUrl(url)).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function hueOf(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return h % 360;
}

export function findTemplate(templates: ServiceTemplate[], link: ServiceLink): ServiceTemplate | undefined {
  return (
    templates.find((t) => t.id === link.templateId) ??
    templates.find((t) => t.name.toLowerCase() === link.name.toLowerCase())
  );
}

export function resolveKind(field: CustomField, tpl?: ServiceTemplate): FieldKind {
  if (field.kind) return field.kind;
  const def = tpl?.fields.find((f) => f.name.toLowerCase() === field.key.toLowerCase());
  if (def) return def.kind;
  return field.secret ? 'secret' : 'text';
}

export function toCustomField(name: string, kind: FieldKind, value: string): CustomField {
  return {
    key: name,
    value: kind === 'totp' ? normalizeBase32(value) : value.trim(),
    secret: FIELD_KINDS[kind].secret,
    kind,
  };
}

export function validateValue(kind: FieldKind, value: string, required?: boolean): string | null {
  const v = value.trim();
  if (!v) return required ? 'Required' : null;
  if (kind === 'totp' && !isBase32(v)) return 'Base32 only (letters A-Z, digits 2-7)';
  if (kind === 'url' && !isValidUrl(v)) return 'Invalid URL';
  return null;
}