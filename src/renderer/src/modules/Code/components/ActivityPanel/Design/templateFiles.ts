import type { DesignGraph } from '../../../hooks/useDesignStore';

const websiteFiles = import.meta.glob('./template/website/*.{ts,tsx,md,png}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const mobileFiles = import.meta.glob('./template/mobile/*.{ts,tsx,md,png}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export function getTemplateFiles(platform: 'website' | 'mobile' = 'website'): Record<string, string> {
  const rawFiles = platform === 'mobile' ? mobileFiles : websiteFiles;
  const files: Record<string, string> = {};
  for (const [filePath, content] of Object.entries(rawFiles)) {
    // Remove './template/website/' or './template/mobile/' prefix
    const cleanPath = filePath.replace(`./template/${platform}/`, '');
    files[cleanPath] = content;
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

export function getTemplateGraph(platform: 'website' | 'mobile' = 'website'): DesignGraph {
  const stamp = Date.now();
  const ids = PAGES.map((p) => `node_${stamp}_${p.key}`);
  // ASSUMED: Mobile layout khác website (stack vertical thay vì horizontal)
  const isVertical = platform === 'mobile';
  return {
    nodes: PAGES.map((p, i) => ({
      id: ids[i],
      name: p.name,
      route: p.route,
      file: p.file,
      x: isVertical ? 80 : 80 + i * 400,
      y: isVertical ? 80 + i * 320 : 120,
    })),
    edges: PAGES.slice(1).map((p, i) => ({
      id: `edge_${stamp}_${PAGES[i].key}_${p.key}`,
      from: ids[i],
      to: ids[i + 1],
    })),
  };
}