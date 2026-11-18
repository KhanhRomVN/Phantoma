import { Key, Link2, List, ListOrdered, Lock, Smartphone, Type } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AuthMethod, FieldKind, TwoFactorType } from '../types';
import type { Tone } from '../types/ui.types';


export interface ServiceMeta {
  label: string;
  icon: LucideIcon;
  tone: Tone;
}

export interface AutoField {
  name: string;
  kind: FieldKind;
}

export interface AuthProviderMeta {
  label: string;
  url: string;
}

export const AUTH_METHODS: Record<AuthMethod, AuthProviderMeta> = {
  google: { label: 'Google', url: 'https://google.com' },
  gmail: { label: 'Gmail', url: 'https://mail.google.com' },
  discord: { label: 'Discord', url: 'https://discord.com' },
  github: { label: 'GitHub', url: 'https://github.com' },
  apple: { label: 'Apple', url: 'https://apple.com' },
  microsoft: { label: 'Microsoft', url: 'https://microsoft.com' },
  facebook: { label: 'Facebook', url: 'https://facebook.com' },
  telegram: { label: 'Telegram', url: 'https://telegram.org' },
  x: { label: 'X', url: 'https://x.com' },
};

export const TWO_FACTOR: Record<TwoFactorType, ServiceMeta & { field: AutoField }> = {
  totp: { label: 'TOTP', icon: Smartphone, tone: 'primary', field: { name: 'TOTP secret', kind: 'totp' } },
  backup: { label: 'Backup codes', icon: ListOrdered, tone: 'warn', field: { name: 'Backup codes', kind: 'backup' } },
};

export const FIELD_KINDS: Record<FieldKind, ServiceMeta & { secret: boolean; placeholder: string }> = {
  text: { label: 'Text', icon: Type, tone: 'muted', secret: false, placeholder: 'Value' },
  secret: { label: 'Secret text', icon: Lock, tone: 'warn', secret: true, placeholder: 'Hidden value' },
  api: { label: 'API key', icon: Key, tone: 'info', secret: true, placeholder: 'sk_live_...' },
  totp: { label: 'TOTP secret', icon: Smartphone, tone: 'primary', secret: true, placeholder: 'Base32, e.g. JBSWY3DPEHPK3PXP' },
  backup: { label: 'Backup codes', icon: ListOrdered, tone: 'success', secret: true, placeholder: 'One code per line' },
  array: { label: 'Array', icon: List, tone: 'success', secret: false, placeholder: 'One item per line' },
  url: { label: 'URL', icon: Link2, tone: 'info', secret: false, placeholder: 'https://' },
};

export const FIELD_KIND_ORDER = Object.keys(FIELD_KINDS) as FieldKind[];
export const CUSTOM_FIELD_KIND_ORDER: FieldKind[] = ['text', 'secret', 'array', 'url'];
export const AUTH_ORDER = Object.keys(AUTH_METHODS) as AuthMethod[];
export const TWO_FACTOR_ORDER = Object.keys(TWO_FACTOR) as TwoFactorType[];

