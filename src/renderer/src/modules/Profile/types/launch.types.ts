import type { LucideIcon } from 'lucide-react';
import type { Tone } from './ui.types';

export type DetailTab = 'proxy' | 'fingerprint';

export interface Fork {
  id: string;
  name: string;
  version: string | null;
  desc: string;
  badge: string;
  tone: Tone;
  url: string;
  path: string | null;
  installed: boolean;
}

export interface Toggle {
  id: string;
  label: string;
  desc: string;
  chromiumOnly?: boolean;
  defaultOn: boolean;
}

export interface Phase {
  id: string;
  label: string;
  icon: LucideIcon;
  tone: Tone;
  items: Toggle[];
}

export interface ParsedQuery {
  text: string[];
  keys: [string, string][];
  ping: number | null;
}

export interface FilterTag {
  id: string;
  label: string;
  onRemove: () => void;
}