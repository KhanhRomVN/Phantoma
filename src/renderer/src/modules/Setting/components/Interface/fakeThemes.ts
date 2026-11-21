import { PRESET_THEMES } from '../../../../theme/theme-loader';
import type { ThemeConfig } from '../../../../theme/theme-loader';

type RGB = [number, number, number];

const rgb = ([r, g, b]: RGB) => `rgb(${r}, ${g}, ${b})`;
const mix = (a: RGB, b: RGB, t: number): RGB => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
];

const DARK_ACCENTS: Record<string, RGB> = {
  success: [74, 222, 128],
  error: [248, 113, 113],
  warn: [251, 191, 36],
  info: [96, 165, 250],
  blue: [96, 165, 250],
  green: [74, 222, 128],
  red: [248, 113, 113],
  yellow: [250, 204, 21],
  purple: [192, 132, 252],
  pink: [244, 114, 182],
  navy: [59, 90, 160],
  teal: [45, 212, 191],
  violet: [139, 92, 246],
};

const LIGHT_ACCENTS: Record<string, RGB> = {
  success: [22, 163, 74],
  error: [220, 38, 38],
  warn: [217, 119, 6],
  info: [37, 99, 235],
  blue: [37, 99, 235],
  green: [22, 163, 74],
  red: [220, 38, 38],
  yellow: [202, 138, 4],
  purple: [147, 51, 234],
  pink: [219, 39, 119],
  navy: [30, 58, 138],
  teal: [13, 148, 136],
  violet: [109, 40, 217],
};

interface Seed {
  name: string;
  type: 'dark' | 'light';
  bg: RGB;
  panel: RGB;
  card: RGB;
  text: RGB;
  textSecondary: RGB;
  border: RGB;
  primary: RGB;
}

const SEEDS: Seed[] = [
  { name: 'Aurora Night', type: 'dark', bg: [11, 14, 26], panel: [15, 19, 34], card: [20, 25, 44], text: [230, 235, 250], textSecondary: [140, 150, 180], border: [36, 43, 70], primary: [99, 102, 241] },
  { name: 'Ember Dusk', type: 'dark', bg: [20, 13, 12], panel: [27, 18, 16], card: [36, 24, 21], text: [250, 238, 230], textSecondary: [176, 150, 140], border: [58, 40, 35], primary: [249, 115, 22] },
  { name: 'Mint Terminal', type: 'dark', bg: [8, 18, 16], panel: [12, 25, 22], card: [17, 34, 30], text: [220, 245, 238], textSecondary: [120, 160, 148], border: [28, 52, 46], primary: [16, 185, 129] },
  { name: 'Orchid Mist', type: 'dark', bg: [18, 12, 24], panel: [24, 17, 32], card: [32, 23, 43], text: [244, 232, 252], textSecondary: [166, 140, 186], border: [52, 38, 68], primary: [217, 70, 239] },
  { name: 'Paper Light', type: 'light', bg: [250, 250, 249], panel: [245, 245, 243], card: [255, 255, 255], text: [28, 25, 23], textSecondary: [120, 113, 108], border: [228, 225, 220], primary: [234, 88, 12] },
  { name: 'Sky Light', type: 'light', bg: [246, 250, 255], panel: [238, 245, 253], card: [255, 255, 255], text: [15, 23, 42], textSecondary: [100, 116, 139], border: [214, 226, 242], primary: [14, 165, 233] },
  { name: 'Lavender Light', type: 'light', bg: [250, 247, 255], panel: [243, 238, 252], card: [255, 255, 255], text: [30, 20, 50], textSecondary: [115, 100, 145], border: [224, 214, 240], primary: [139, 92, 246] },
  { name: 'Sage Light', type: 'light', bg: [247, 250, 246], panel: [240, 245, 238], card: [255, 255, 255], text: [24, 38, 28], textSecondary: [100, 125, 106], border: [215, 228, 212], primary: [22, 163, 74] },
];

const build = (s: Seed): ThemeConfig => {
  const base = PRESET_THEMES.find((t) => t.type === s.type) ?? PRESET_THEMES[0];
  const accents = s.type === 'dark' ? DARK_ACCENTS : LIGHT_ACCENTS;
  const toward: RGB = s.type === 'dark' ? [255, 255, 255] : [0, 0, 0];
  const tailwind: Record<string, string> = {
    primary: rgb(s.primary),
    background: rgb(s.bg),
    textPrimary: rgb(s.text),
    textSecondary: rgb(s.textSecondary),
    textForeground: rgb(s.text),
    border: rgb(s.border),
    divider: rgb(s.border),
    cardBackground: rgb(s.card),
    cardBackgroundHover: rgb(mix(s.card, toward, 0.05)),
    inputBackground: rgb(mix(s.bg, s.card, 0.5)),
    dropdownBackground: rgb(s.card),
    dropdownContentBackground: rgb(s.card),
    dropdownItemHover: rgb(mix(s.card, toward, 0.08)),
    tooltipBackground: rgb(mix(s.card, toward, 0.1)),
    panelBackground: rgb(s.panel),
    tableHeaderBackground: rgb(mix(s.panel, toward, 0.03)),
    tableFooterBackground: rgb(mix(s.panel, toward, 0.03)),
    tableRowHover: rgb(mix(s.bg, toward, 0.05)),
  };
  Object.entries(accents).forEach(([k, v]) => {
    tailwind[k] = rgb(v);
  });
  return {
    ...base,
    id: `preview-${s.name.toLowerCase().replace(/\s+/g, '-')}`,
    name: s.name,
    type: s.type,
    tailwind: tailwind as unknown as ThemeConfig['tailwind'],
    accentColors: ['blue', 'purple', 'pink', 'teal'].map((k) => rgb(accents[k])),
  };
};

// ASSUMED: preview themes are applied like presets but not persisted across reloads (ThemeProvider only restores PRESET_THEMES)
export const FAKE_THEMES: ThemeConfig[] = SEEDS.map(build);