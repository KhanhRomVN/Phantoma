import type { LucideIcon } from 'lucide-react';

export type SectionId = 'provider' | 'credentials' | 'models' | 'quota' | 'format' | 'network' | 'notes';
export type Values = Record<string, string>;

export interface SectionMeta {
  name: string;
  shortDesc: string;
  icon: LucideIcon;
  color: string;
}

export interface ProviderState {
  name: string;
  type: string;
  url: string;
  website: string;
}

export interface Preset extends ProviderState {
  config?: Values;
  models?: string;
}

export interface FieldDef {
  key: string;
  label: string;
  placeholder?: string;
  kind?: 'text' | 'secret' | 'select' | 'date' | 'area' | 'toggle';
  options?: string[];
  hint?: string;
  full?: boolean;
  types?: string[];
  icon?: LucideIcon;
  color?: string;
  defaultOn?: boolean;
  groupLabel?: string;
}
