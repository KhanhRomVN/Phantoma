export const PLATFORM_TABS = [
  { id: 'web', icon: 'Globe', label: 'Web', color: 'sky' },
  { id: 'pc', icon: 'Monitor', label: 'PC', color: 'violet' },
  { id: 'android', icon: 'Smartphone', label: 'Android', color: 'emerald' },
  { id: 'cli', icon: 'Terminal', label: 'CLI', color: 'amber' },
] as const;

export type PlatformId = typeof PLATFORM_TABS[number]['id'];

export const PLATFORM_COLORS: Record<PlatformId, {
  text: string;
  bg: string;
  border: string;
  badge: string;
}> = {
  web: {
    text: 'text-sky-400',
    bg: 'bg-sky-500/15',
    border: 'border-sky-500/25',
    badge: 'bg-sky-500/10 text-sky-400',
  },
  pc: {
    text: 'text-violet-400',
    bg: 'bg-violet-500/15',
    border: 'border-violet-500/25',
    badge: 'bg-violet-500/10 text-violet-400',
  },
  android: {
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/25',
    badge: 'bg-emerald-500/10 text-emerald-400',
  },
  cli: {
    text: 'text-amber-400',
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/25',
    badge: 'bg-amber-500/10 text-amber-400',
  },
};

export const TOOL_COLORS: Record<string, {
  text: string;
  bg: string;
  border: string;
  hover: string;
}> = {
  intruder: { text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/25', hover: 'hover:bg-purple-500/20' },
  wasm: { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/25', hover: 'hover:bg-blue-500/20' },
  media: { text: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/25', hover: 'hover:bg-pink-500/20' },
  payload: { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/25', hover: 'hover:bg-orange-500/20' },
  compare: { text: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/25', hover: 'hover:bg-green-500/20' },
  composer: { text: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/25', hover: 'hover:bg-cyan-500/20' },
  setting: { text: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/25', hover: 'hover:bg-gray-500/20' },
  source: { text: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/25', hover: 'hover:bg-yellow-500/20' },
  log: { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/25', hover: 'hover:bg-red-500/20' },
};