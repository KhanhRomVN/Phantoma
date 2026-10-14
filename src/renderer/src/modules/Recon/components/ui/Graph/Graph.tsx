import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { GraphEdge, GraphNode } from '../types';
import { ReconGraphContext } from './ReconGraphContext';
import { buildGraph } from './graphBuilder';
import { getFaviconUrl } from '@renderer/shared/utils/faviconUtils';

interface Props {
  nodes: GraphNode[];
  edges: GraphEdge[];
  /** true = dùng node:/edge: khai báo trong box (source=manual); false = tự dựng từ header và field:value. */
  manual?: boolean;
  /** 'tab' = chỉ tab đang xem; mặc định lấy mọi tab của task. */
  scope?: string;
}

type Pos = Record<string, { x: number; y: number }>;
interface View {
  x: number;
  y: number;
  k: number;
}
interface Drag {
  kind: 'node' | 'pan';
  id?: string;
  sx: number;
  sy: number;
  ox: number;
  oy: number;
  moved: boolean;
}

const MIN_K = 0.2;
const MAX_K = 4;
const NODE_R = 14;
const DRAG_THRESHOLD = 3;

const TYPE_COLORS: Record<string, string> = {
  person: '#8b5cf6',
  domain: '#10b981',
  device: '#f59e0b',
  social: '#ec4899',
  group: '#64748b',
  section: '#0ea5e9',
};

/** Bố cục lực đẩy/lò xo chạy một lần, kết quả xác định theo thứ tự node. */
function computeLayout(nodes: GraphNode[], edges: GraphEdge[]): Pos {
  const n = nodes.length;
  const out: Pos = {};
  if (n === 0) return out;
  const r = Math.max(120, Math.sqrt(n) * 60);
  const p = nodes.map((nd, i) => {
    const a = (i / n) * 2 * Math.PI;
    return { id: nd.id, x: r * Math.cos(a), y: r * Math.sin(a), vx: 0, vy: 0 };
  });
  const idx = new Map(p.map((q, i) => [q.id, i] as const));
  const links: [number, number][] = [];
  for (const e of edges) {
    const a = idx.get(e.from);
    const b = idx.get(e.to);
    if (a !== undefined && b !== undefined) links.push([a, b]);
  }

  const iters = n > 400 ? 80 : 250;
  for (let it = 0; it < iters; it++) {
    const alpha = 1 - it / iters;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = p[i].x - p[j].x;
        const dy = p[i].y - p[j].y;
        const d2 = Math.max(dx * dx + dy * dy, 25);
        const d = Math.sqrt(d2);
        const f = 4000 / d2;
        p[i].vx += (dx / d) * f;
        p[i].vy += (dy / d) * f;
        p[j].vx -= (dx / d) * f;
        p[j].vy -= (dy / d) * f;
      }
    }
    for (const [a, b] of links) {
      const dx = p[b].x - p[a].x;
      const dy = p[b].y - p[a].y;
      const d = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      const f = (d - 110) * 0.04;
      p[a].vx += (dx / d) * f;
      p[a].vy += (dy / d) * f;
      p[b].vx -= (dx / d) * f;
      p[b].vy -= (dy / d) * f;
    }
    for (const q of p) {
      q.vx = (q.vx - q.x * 0.01) * 0.6;
      q.vy = (q.vy - q.y * 0.01) * 0.6;
      q.x += q.vx * alpha;
      q.y += q.vy * alpha;
    }
  }
  for (const q of p) out[q.id] = { x: q.x, y: q.y };
  return out;
}

/**
 * Graph tương tác: lăn chuột để thu phóng, kéo nền để di chuyển, kéo node để đổi vị trí,
 * click node để chọn (chỉ node/edge liên quan sáng, phần còn lại mờ đi). Click nền để bỏ chọn.
 */
export default function Graph({ nodes: manualNodes, edges: manualEdges, manual = false, scope }: Props) {
  const { tabs, activeTab } = useContext(ReconGraphContext);
  const graph = useMemo(
    () => (manual ? { nodes: manualNodes, edges: manualEdges } : buildGraph(tabs, { scope, activeTab })),
    [manual, manualNodes, manualEdges, tabs, scope, activeTab]
  );
  const initial = useMemo(() => computeLayout(graph.nodes, graph.edges), [graph]);

  const [positions, setPositions] = useState<Pos>(initial);
  const [view, setView] = useState<View>({ x: 0, y: 0, k: 1 });
  const [selected, setSelected] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 });
  const centeredRef = useRef(false);

  // Graph đổi (dữ liệu hoặc scope) thì đặt lại vị trí và bỏ chọn
  useEffect(() => {
    setPositions(initial);
    setSelected(null);
  }, [initial]);

  // Căn gốc toạ độ vào giữa khung ở lần đo đầu tiên
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      sizeRef.current = { w: r.width, h: r.height };
      if (!centeredRef.current && r.width > 0 && r.height > 0) {
        centeredRef.current = true;
        setView({ x: r.width / 2, y: r.height / 2, k: 1 });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Thu phóng quanh con trỏ; cần listener không-passive để chặn cuộn trang
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const mx = e.clientX - r.left;
      const my = e.clientY - r.top;
      setView((v) => {
        const k = Math.min(MAX_K, Math.max(MIN_K, v.k * Math.exp(-e.deltaY * 0.0015)));
        const s = k / v.k;
        return { k, x: mx - (mx - v.x) * s, y: my - (my - v.y) * s };
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const related = useMemo(() => {
    if (!selected) return null;
    const ids = new Set<string>([selected]);
    for (const e of graph.edges) {
      if (e.from === selected) ids.add(e.to);
      if (e.to === selected) ids.add(e.from);
    }
    return ids;
  }, [selected, graph.edges]);

  const handleDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    const nodeId = (e.target as Element).closest('[data-node]')?.getAttribute('data-node') ?? undefined;
    const base = nodeId ? positions[nodeId] : undefined;
    dragRef.current = nodeId && base
      ? { kind: 'node', id: nodeId, sx: e.clientX, sy: e.clientY, ox: base.x, oy: base.y, moved: false }
      : { kind: 'pan', sx: e.clientX, sy: e.clientY, ox: view.x, oy: view.y, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    d.moved = true;
    if (d.kind === 'node' && d.id) {
      const id = d.id;
      setDraggingId(id);
      setPositions((p) => ({ ...p, [id]: { x: d.ox + dx / view.k, y: d.oy + dy / view.k } }));
    } else {
      setView((v) => ({ ...v, x: d.ox + dx, y: d.oy + dy }));
    }
  };

  const handleUp = () => {
    const d = dragRef.current;
    dragRef.current = null;
    setDraggingId(null);
    if (!d || d.moved) return;
    // Không di chuyển = click: chọn/bỏ chọn node, click nền thì bỏ chọn
    if (d.kind === 'node' && d.id) {
      const id = d.id;
      setSelected((prev) => (prev === id ? null : id));
    } else {
      setSelected(null);
    }
  };

  const resetView = () => {
    const { w, h } = sizeRef.current;
    setView({ x: w / 2, y: h / 2, k: 1 });
  };

  return (
    <div ref={containerRef} className='w-full flex-1 min-h-[200px] bg-black/20 rounded overflow-hidden relative'>
      <svg
        ref={svgRef}
        width='100%'
        height='100%'
        className='absolute inset-0 w-full h-full touch-none select-none'
        style={{ cursor: draggingId ? 'grabbing' : 'default' }}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        onPointerCancel={handleUp}
      >
        <g transform={`translate(${view.x}, ${view.y}) scale(${view.k})`}>
          {graph.edges.map((edge, idx) => {
            const a = positions[edge.from];
            const b = positions[edge.to];
            if (!a || !b) return null;
            const active = !selected || edge.from === selected || edge.to === selected;
            const c = edge.confidence;
            const stroke = c === undefined ? '#6b7280' : c >= 0.75 ? '#4ade80' : c >= 0.5 ? '#facc15' : '#f87171';
            const width = c === undefined ? 1.5 : Math.max(1, c * 3);
            return (
              <g key={`edge-${idx}`} opacity={active ? 1 : 0.1} className='pointer-events-none'>
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={stroke}
                  strokeWidth={width}
                  strokeDasharray={c !== undefined && c < 0.5 ? '4,4' : undefined}
                  opacity={0.7}
                />
                {edge.label && (view.k >= 0.8 || (selected && active)) && (
                  <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 4} fill='#9ca3af' fontSize='8' textAnchor='middle'>
                    {edge.label}
                  </text>
                )}
              </g>
            );
          })}

          {graph.nodes.map((node) => {
            const pos = positions[node.id];
            if (!pos) return null;
            const active = !related || related.has(node.id);
            const fill = TYPE_COLORS[node.type] ?? '#3b82f6';
            const isSel = selected === node.id;
            return (
              <g
                key={node.id}
                data-node={node.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                opacity={active ? 1 : 0.15}
                style={{ cursor: draggingId === node.id ? 'grabbing' : 'grab' }}
              >
                <circle r={NODE_R} fill={fill} stroke={isSel ? '#fff' : 'rgba(255,255,255,0.5)'} strokeWidth={isSel ? 3 : 1} />
                {node.url && (
                  <>
                    <circle r={10} fill='#fff' className='pointer-events-none' />
                    <image
                      href={getFaviconUrl(node.url, 32)}
                      x={-8}
                      y={-8}
                      width={16}
                      height={16}
                      className='pointer-events-none'
                      onError={(ev) => {
                        ev.currentTarget.style.display = 'none';
                      }}
                    />
                  </>
                )}
                <text dy={NODE_R + 12} textAnchor='middle' fill='#e5e7eb' fontSize='10' fontWeight='bold' className='pointer-events-none'>
                  {node.label.length > 18 ? node.label.substring(0, 17) + '..' : node.label}
                </text>
                <title>{`${node.label} (${node.type})`}</title>
              </g>
            );
          })}
        </g>
      </svg>

      {graph.nodes.length === 0 && (
        <div className='absolute inset-0 flex items-center justify-center text-text-secondary italic pointer-events-none'>
          Không có thực thể nào.
        </div>
      )}

      <button
        type='button'
        onClick={resetView}
        className='absolute top-2 right-2 text-[10px] text-text-secondary bg-background/80 px-2 py-1 rounded border border-border hover:text-text-primary'
      >
        {Math.round(view.k * 100)}% • Căn lại
      </button>
      <div className='absolute bottom-2 right-2 text-[10px] text-gray-500 bg-background/80 px-2 py-1 rounded border border-border pointer-events-none'>
        Lăn: thu phóng • Kéo nền: di chuyển • Kéo node: đổi vị trí • Click: chọn
      </div>
    </div>
  );
}