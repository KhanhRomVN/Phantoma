import { type G, type Pages } from './helpers';

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');
const EMPTY = /^(—|-|\(empty\)|\(hidden\)|n\/a)$/i;

/**
 * Truy cập dữ liệu GlassBox theo tên panel/row (không phụ thuộc dấu câu, hoa/thường).
 *   gb.row('UA client hints', 'uaFullVersion')
 */
export function glassbox(p: Pages) {
  const g = p('glassbox');
  const panels: G = g.panels || {};
  const panelOf = (name: string): G | undefined => {
    const k = Object.keys(panels).find((x) => norm(x) === norm(name));
    return k ? panels[k] : undefined;
  };
  return {
    browser: g.browser as string | undefined,
    identity: (g.identity || {}) as G,
    row(panel: string, row: string): string | undefined {
      const rows: G | undefined = panelOf(panel)?.rows;
      const k = rows && Object.keys(rows).find((x) => norm(x) === norm(row));
      const v = k ? String(rows![k]).trim() : '';
      return v && !EMPTY.test(v) ? v : undefined;
    },
  };
}
export type Glassbox = ReturnType<typeof glassbox>;

/** Tên panel dùng nhiều nơi. */
export const GB = {
  ip: 'Your IP · location · network',
  uaHints: 'UA client hints',
  netInfo: 'Network information',
  css: 'CSS media features',
  screen: 'Screen & display',
  gpu: 'WebGPU adapter',
  gl: 'WebGL renderer',
  tz: 'Timezone & locale',
  media: 'Media devices',
  apis: 'API support matrix',
  wasm: 'WebAssembly',
  storage: 'Storage & quota',
  incognito: 'Private / incognito guess',
} as const;
