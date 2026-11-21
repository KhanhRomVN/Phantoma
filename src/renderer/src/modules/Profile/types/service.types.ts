export type ServiceStatus =
  | 'active'
  | 'pending'
  | 'limited'
  | 'checkpoint'
  | 'verification'
  | 'locked'
  | 'suspended'
  | 'shadowbanned'
  | 'compromised'
  | 'banned'
  | 'deleted';

export type FieldKind = 'text' | 'secret' | 'api' | 'totp' | 'backup' | 'array' | 'url';
export type AuthMethod = 'google' | 'gmail' | 'discord' | 'github' | 'apple' | 'microsoft' | 'facebook' | 'telegram' | 'x';
export type TwoFactorType = 'totp' | 'backup';

export interface CustomField {
  key: string;
  value: string;
  secret?: boolean;
  kind?: FieldKind;
}

export interface ServiceLink {
  id: string;
  name: string;
  status: ServiceStatus;
  statusNote?: string;
  linkedAt: string;
  customFields: CustomField[];
  templateId?: string;
}

export interface FieldDef {
  id: string;
  name: string;
  kind: FieldKind;
  required?: boolean;
}

export interface ServiceTemplate {
  id: string;
  name: string;
  url: string;
  authMethods: AuthMethod[];
  twoFactor: TwoFactorType[];
  fields: FieldDef[];
  category?: string;
  builtin?: boolean;
}