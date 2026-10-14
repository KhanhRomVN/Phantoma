import type { GraphEdge, GraphNode, ReconTab } from '../types';

export interface BuiltGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface BuildOptions {
  /** 'task' = mọi tab, 'tab' = chỉ tab đang xem. */
  scope?: string;
  activeTab?: string;
}

const FIELD_RE = /^(\p{L}[^:|]{0,59}):\s+(.+)$/u;
const DOMAIN_RE = /^(?:[a-z0-9-]+\.)+[a-z]{2,}$/i;

const norm = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();

/** Bóc `[type]` và các khối `{k=v}` khỏi giá trị. */
function cleanValue(raw: string): { value: string; type: string } {
  const typeMatch = raw.match(/\[(\w+)\]/);
  const value = raw.replace(/\[(\w+)\]/g, '').replace(/\{[^}]*\}/g, '').trim();
  return { value, type: typeMatch ? typeMatch[1] : 'value' };
}

/** Suy ra url để lấy favicon: url đầy đủ, hoặc tên miền trần (thêm https://). */
function urlOf(value: string, type: string): string | undefined {
  if (/^https?:\/\//i.test(value)) return value;
  if ((type === 'domain' || type === 'url' || DOMAIN_RE.test(value)) && DOMAIN_RE.test(value)) {
    return `https://${value}`;
  }
  return undefined;
}

/**
 * Dựng graph từ dữ liệu .recon: header 1 (`# `) là node nhóm, header 2 (`## `) là node con,
 * mỗi dòng `field: value` là node giá trị nối vào header chứa nó (nhãn edge = field).
 * Giá trị trùng nhau (không phân biệt hoa thường, bỏ khoảng trắng thừa) gộp thành một node.
 */
export function buildGraph(tabs: ReconTab[], opts: BuildOptions = {}): BuiltGraph {
  const nodes = new Map<string, GraphNode>();
  const edges = new Map<string, GraphEdge>();

  const addNode = (n: GraphNode) => {
    if (!nodes.has(n.id)) nodes.set(n.id, n);
  };
  const addEdge = (from: string, to: string, label: string) => {
    if (from === to) return;
    const key = `${from}|${to}|${label}`;
    if (!edges.has(key)) edges.set(key, { from, to, label });
  };

  const source = opts.scope === 'tab' && opts.activeTab ? tabs.filter((t) => t.name === opts.activeTab) : tabs;

  for (const tab of source) {
    for (const box of tab.boxes) {
      if (box.box.ui === 'graph') continue;
      const h1Id = `h1:${tab.name}:${norm(box.label)}`;
      addNode({ id: h1Id, label: box.label, type: 'group' });

      let parentId = h1Id;
      let inCode = false;
      for (const rawLine of box.rawBody.split('\n')) {
        const line = rawLine.trim();
        if (line.startsWith('```')) inCode = !inCode;
        if (inCode || !line || line.startsWith('@box')) continue;

        const h2 = line.match(/^##\s+(.+)$/);
        if (h2) {
          parentId = `h2:${tab.name}:${norm(box.label)}:${norm(h2[1])}`;
          addNode({ id: parentId, label: h2[1].trim(), type: 'section' });
          addEdge(h1Id, parentId, '');
          continue;
        }
        if (/^(-|\||#|node:|edge:)/.test(line)) continue;

        const m = line.match(FIELD_RE);
        if (!m) continue;
        const { value, type } = cleanValue(m[2]);
        if (!value) continue;
        const vId = `v:${norm(value)}`;
        addNode({ id: vId, label: value, type, url: urlOf(value, type) });
        addEdge(parentId, vId, m[1].trim());
      }
    }
  }

  return { nodes: [...nodes.values()], edges: [...edges.values()] };
}