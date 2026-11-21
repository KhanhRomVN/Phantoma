import { Battery, Cpu, Database, Eye, Fingerprint, Globe, Languages, Layers, Maximize2, Monitor, Palette, Puzzle, Wifi } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const SECTION_ICON: Record<string, LucideIcon> = {
  ua: Fingerprint,
  hardware: Cpu,
  screen: Monitor,
  window: Maximize2,
  locale: Languages,
  meta: Globe,
  canvas: Layers,
  prefs: Eye,
  color: Palette,
  storage: Database,
  battery: Battery,
  plugins: Puzzle,
  network: Wifi,
};

export const MONO_LABELS = new Set([
  'User agent',
  'App version',
  'OS CPU',
  'Canvas seed',
  'WebGL renderer',
  'WebGL version',
  'WebGL shading lang',
  'Latitude',
  'Longitude',
]);