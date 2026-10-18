import type { DesignGraph } from '../../../hooks/useDesignStore';

const rawFiles = import.meta.glob('./template/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export function getTemplateFiles(): Record<string, string> {
  const files: Record<string, string> = {};
  for (const [filePath, content] of Object.entries(rawFiles)) {
    files[filePath.replace('./template/', '')] = content;
  }
  return files;
}

const PAGES = [
  { key: 'home', name: 'Home', route: '/', file: 'Home.tsx' },
  { key: 'emulate', name: 'Emulate', route: '/emulate', file: 'Emulate.tsx' },
  { key: 'agent', name: 'Agent', route: '/agent', file: 'Agent.tsx' },
  { key: 'download', name: 'Download', route: '/download', file: 'Download.tsx' },
  { key: 'faq', name: 'Faq', route: '/faq', file: 'Faq.tsx' },
];

export function getTemplateGraph(): DesignGraph {
  const stamp = Date.now();
  const ids = PAGES.map((p) => `node_${stamp}_${p.key}`);
  return {
    nodes: PAGES.map((p, i) => ({
      id: ids[i],
      name: p.name,
      route: p.route,
      file: p.file,
      x: 80 + i * 400,
      y: 120,
    })),
    edges: PAGES.slice(1).map((p, i) => ({
      id: `edge_${stamp}_${PAGES[i].key}_${p.key}`,
      from: ids[i],
      to: ids[i + 1],
    })),
  };
}