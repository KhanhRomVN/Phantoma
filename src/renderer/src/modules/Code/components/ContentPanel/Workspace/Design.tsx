/**
 * Design tab - integrated into Workspace
 * Combines canvas view and viewer into a single component
 */

import { useEffect, useState, useRef, memo } from 'react';
import { Palette, Loader2, ArrowLeft, ArrowRight, RotateCw } from 'lucide-react';
import { useCodeStore } from '../../../hooks/useCodeStore';
import { useDesignStore, type DesignGraph, type DesignMeta, type DesignNode, type DesignEdge } from '../../../hooks/useDesignStore';
import { cn } from '@renderer/utils/cn';

// ─── Design URL helper ──────────────────────────────────────────────

function toBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function getDesignPageUrl(
  projectPath: string,
  designId: string,
  file: string,
  stamp = 0,
): string {
  return `phantoma-design://page/${toBase64Url(projectPath)}/${designId}/${encodeURIComponent(file)}?t=${stamp}`;
}

// ─── Canvas constants ───────────────────────────────────────────────

const NODE_WIDTH = 280;
const PREVIEW_HEIGHT = 168;
const NODE_HEIGHT = PREVIEW_HEIGHT + 66;
const FRAME_WIDTH = 1120;
const FRAME_HEIGHT = 672;
const PREVIEW_SCALE = NODE_WIDTH / FRAME_WIDTH;
const DRAG_THRESHOLD = 3;

type DragState =
  | { kind: 'node'; id: string; startX: number; startY: number; origX: number; origY: number; moved: boolean }
  | { kind: 'pan'; startX: number; startY: number; origX: number; origY: number };

// ─── NodePreview ────────────────────────────────────────────────────

function NodePreview({
  projectPath,
  designId,
  file,
}: {
  projectPath: string;
  designId: string;
  file: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const url = getDesignPageUrl(projectPath, designId, file);

  useEffect(() => {
    setLoaded(false);
  }, [url]);

  return (
    <div
      className="relative overflow-hidden border-b border-divider bg-white"
      style={{ height: PREVIEW_HEIGHT }}
    >
      <iframe
        title={file}
        sandbox="allow-scripts"
        scrolling="no"
        src={url}
        onLoad={() => setLoaded(true)}
        tabIndex={-1}
        className="pointer-events-none absolute left-0 top-0 border-0 bg-white"
        style={{
          width: FRAME_WIDTH,
          height: FRAME_HEIGHT,
          transform: `scale(${PREVIEW_SCALE})`,
          transformOrigin: 'top left',
        }}
      />
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-sidebar-background text-text-secondary/50">
          <Loader2 className="h-5 w-5 animate-spin" strokeWidth={1.5} />
        </div>
      )}
    </div>
  );
}

function edgePath(from: DesignNode, to: DesignNode): string {
  const toRight = to.x + NODE_WIDTH / 2 >= from.x + NODE_WIDTH / 2;
  const x1 = from.x + (toRight ? NODE_WIDTH : 0);
  const y1 = from.y + NODE_HEIGHT / 2;
  const x2 = to.x + (toRight ? 0 : NODE_WIDTH);
  const y2 = to.y + NODE_HEIGHT / 2;
  const curve = Math.max(40, Math.abs(x2 - x1) / 2);
  const dir = toRight ? 1 : -1;
  return `M ${x1} ${y1} C ${x1 + curve * dir} ${y1}, ${x2 - curve * dir} ${y2}, ${x2} ${y2}`;
}

// ─── DesignCanvas ───────────────────────────────────────────────────

interface DesignCanvasProps {
  projectPath: string;
  designId: string;
  nodes: DesignNode[];
  edges: DesignEdge[];
  onOpen: (nodeId: string) => void;
  onGraphChange: (graph: DesignGraph) => void;
}

const DesignCanvas = memo(function DesignCanvas({
  projectPath,
  designId,
  nodes,
  edges,
  onOpen,
  onGraphChange,
}: DesignCanvasProps) {
  const [localNodes, setLocalNodes] = useState<DesignNode[]>(nodes);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const nodesRef = useRef<DesignNode[]>(nodes);
  const dragRef = useRef<DragState | null>(null);

  useEffect(() => {
    setLocalNodes(nodes);
    nodesRef.current = nodes;
  }, [nodes]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const drag = dragRef.current;
    if (!drag) return;

    if (drag.kind === 'node') {
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      if (!drag.moved && Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return;

      if (!drag.moved) {
        dragRef.current = { ...drag, moved: true };
      }

      setLocalNodes((prev) =>
        prev.map((n) =>
          n.id === drag.id ? { ...n, x: drag.origX + dx, y: drag.origY + dy } : n,
        ),
      );
    } else {
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      setOffset({ x: drag.origX + dx, y: drag.origY + dy });
    }
  };

  const handleMouseUp = () => {
    const drag = dragRef.current;
    if (drag?.kind === 'node' && drag.moved) {
      const updated = localNodes.find((n) => n.id === drag.id);
      if (updated) {
        onGraphChange({ nodes: localNodes, edges });
      }
    }
    dragRef.current = null;
  };

  const startNodeDrag = (nodeId: string, e: React.MouseEvent) => {
    const node = nodesRef.current.find((n) => n.id === nodeId);
    if (!node) return;
    dragRef.current = {
      kind: 'node',
      id: nodeId,
      startX: e.clientX,
      startY: e.clientY,
      origX: node.x,
      origY: node.y,
      moved: false,
    };
  };

  const startPanDrag = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragRef.current = {
      kind: 'pan',
      startX: e.clientX,
      startY: e.clientY,
      origX: offset.x,
      origY: offset.y,
    };
  };

  return (
    <div
      className="relative h-full w-full overflow-hidden bg-background"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onMouseDown={startPanDrag}
    >
      <svg
        className="pointer-events-none absolute left-0 top-0 h-full w-full"
        style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
      >
        {edges.map((edge) => {
          const from = localNodes.find((n) => n.id === edge.from);
          const to = localNodes.find((n) => n.id === edge.to);
          if (!from || !to) return null;
          return (
            <path
              key={edge.id}
              d={edgePath(from, to)}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              className="text-divider"
            />
          );
        })}
      </svg>

      {localNodes.map((node) => (
        <div
          key={node.id}
          className="absolute rounded-lg border border-divider bg-card-background shadow-lg"
          style={{
            width: NODE_WIDTH,
            left: offset.x + node.x,
            top: offset.y + node.y,
            cursor: dragRef.current?.kind === 'node' ? 'grabbing' : 'grab',
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            startNodeDrag(node.id, e);
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            if (dragRef.current?.kind === 'node' && dragRef.current.moved) return;
            onOpen(node.id);
          }}
        >
          <NodePreview projectPath={projectPath} designId={designId} file={node.file} />
          <div className="flex flex-col gap-1 p-3">
            <span className="text-sm font-semibold text-text-primary">{node.name}</span>
            <span className="font-mono text-xs text-text-secondary">{node.route}</span>
          </div>
        </div>
      ))}
    </div>
  );
});

// ─── DesignViewer ───────────────────────────────────────────────────

interface RatioPreset {
  id: string;
  label: string;
  ratio: string;
  width: number;
  height: number;
}

const RATIOS: RatioPreset[] = [
  { id: 'fill', label: 'Responsive', ratio: 'Fill', width: 0, height: 0 },
  { id: '16-9', label: 'Desktop', ratio: '16:9', width: 1920, height: 1080 },
  { id: '4-3', label: 'Tablet landscape', ratio: '4:3', width: 1024, height: 768 },
  { id: '3-4', label: 'Tablet portrait', ratio: '3:4', width: 768, height: 1024 },
  { id: '9-16', label: 'Mobile', ratio: '9:16', width: 360, height: 640 },
  { id: '1-1', label: 'Square', ratio: '1:1', width: 800, height: 800 },
];

function RatioIcon({ width, height }: { width: number; height: number }) {
  const max = 14;
  const fill = width === 0;
  const w = fill ? max : width >= height ? max : (max * width) / height;
  const h = fill ? 10 : height >= width ? max : (max * height) / width;
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" className="shrink-0" aria-hidden>
      <rect
        x={(16 - w) / 2}
        y={(16 - h) / 2}
        width={w}
        height={h}
        rx={1.5}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.4}
        strokeDasharray={fill ? '2.5 2' : undefined}
      />
    </svg>
  );
}

function toHost(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'design';
}

const navBtn =
  'flex h-full w-9 shrink-0 items-center justify-center text-text-secondary transition-colors hover:bg-white/[0.05] hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent';

interface DesignViewerProps {
  projectPath: string;
  design: DesignMeta;
  node: DesignNode;
  onBack: () => void;
  onNavigate: (nodeId: string) => void;
}

const DesignViewer = memo(function DesignViewer({
  projectPath,
  design,
  node,
  onBack,
  onNavigate,
}: DesignViewerProps) {
  const [stamp, setStamp] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [ratioId, setRatioId] = useState('fill');
  const [menuOpen, setMenuOpen] = useState(false);
  const [stage, setStage] = useState({ w: 0, h: 0 });
  const [history, setHistory] = useState<{ stack: string[]; index: number }>({
    stack: [node.id],
    index: 0,
  });

  const stageRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const currentUrl = `https://${toHost(design.name)}.design${node.route}`;
  const [inputUrl, setInputUrl] = useState(currentUrl);
  const pageUrl = getDesignPageUrl(projectPath, design.id, node.file, stamp);

  useEffect(() => {
    setInputUrl(currentUrl);
  }, [currentUrl]);

  useEffect(() => {
    setLoading(true);
  }, [pageUrl]);

  useEffect(() => {
    setHistory((h) =>
      h.stack[h.index] === node.id
        ? h
        : { stack: [...h.stack.slice(0, h.index + 1), node.id], index: h.index + 1 },
    );
  }, [node.id]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) =>
      setStage({ w: entry.contentRect.width, h: entry.contentRect.height }),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const ratio = RATIOS.find((r) => r.id === ratioId) || RATIOS[0];
  const fill = ratio.width === 0;
  const scale = fill
    ? 1
    : Math.min(stage.w / ratio.width, stage.h / ratio.height, 1);
  const frameW = fill ? stage.w : ratio.width * scale;
  const frameH = fill ? stage.h : ratio.height * scale;

  const canGoBack = history.index > 0;
  const canGoForward = history.index < history.stack.length - 1;

  const goBack = () => {
    if (!canGoBack) return;
    const newIndex = history.index - 1;
    setHistory((h) => ({ ...h, index: newIndex }));
    onNavigate(history.stack[newIndex]);
  };

  const goForward = () => {
    if (!canGoForward) return;
    const newIndex = history.index + 1;
    setHistory((h) => ({ ...h, index: newIndex }));
    onNavigate(history.stack[newIndex]);
  };

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-divider bg-sidebar-background px-3">
        <button
          onClick={onBack}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-white/[0.05] hover:text-text-primary"
          title="Back to canvas"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="flex h-8 shrink-0 items-center border-r border-divider pr-2">
          <button onClick={goBack} disabled={!canGoBack} className={navBtn} title="Back">
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
          <button onClick={goForward} disabled={!canGoForward} className={navBtn} title="Forward">
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setStamp(Date.now())}
            className={navBtn}
            title="Reload"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </button>
        </div>

        <input
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
          className="min-w-0 flex-1 rounded-md border border-divider bg-input-background px-2.5 py-1 text-xs text-text-primary placeholder:text-text-secondary/50 focus:border-primary focus:outline-none"
          readOnly
        />

        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex h-7 items-center gap-1.5 rounded-md border border-divider bg-card-background px-2 text-xs text-text-primary transition-colors hover:bg-card-hover"
          >
            <RatioIcon width={ratio.width} height={ratio.height} />
            <span>{ratio.ratio}</span>
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-9 z-10 min-w-[160px] rounded-lg border border-divider bg-card-background py-1 shadow-lg">
              {RATIOS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    setRatioId(r.id);
                    setMenuOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-card-hover',
                    r.id === ratioId ? 'text-primary' : 'text-text-primary',
                  )}
                >
                  <RatioIcon width={r.width} height={r.height} />
                  <span className="flex-1">{r.label}</span>
                  <span className="text-text-secondary">{r.ratio}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div ref={stageRef} className="relative flex min-h-0 flex-1 items-center justify-center">
        <div
          className="relative overflow-hidden rounded-lg border border-divider bg-white shadow-2xl"
          style={{ width: frameW, height: frameH }}
        >
          <iframe
            ref={iframeRef}
            title={node.name}
            sandbox="allow-scripts"
            src={pageUrl}
            onLoad={() => setLoading(false)}
            className="h-full w-full border-0"
          />
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-sidebar-background text-text-secondary">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

// ─── Main Design component ──────────────────────────────────────────

interface DesignProps {
  designId?: string;
}

export function Design({ designId: propDesignId }: DesignProps = {}) {
  const projectPath = useCodeStore((s) => {
    const p = s.projects.find((p) => p.id === s.currentProjectId);
    return p?.path ?? '';
  });

  const designs = useDesignStore((s) => s.designs);
  const storeActiveDesignId = useDesignStore((s) => s.activeDesignId);
  const loadDesigns = useDesignStore((s) => s.loadDesigns);
  const updateGraph = useDesignStore((s) => s.updateGraph);

  // ASSUMED: propDesignId from Workspace panel takes priority over store activeDesignId
  const activeDesignId = propDesignId || storeActiveDesignId;

  const [viewing, setViewing] = useState<{ designId: string; nodeId: string } | null>(null);

  useEffect(() => {
    if (projectPath) void loadDesigns(projectPath);
  }, [projectPath, loadDesigns]);

  const activeDesign = designs.find((d) => d.id === activeDesignId) ?? null;
  const viewingNode =
    activeDesign && viewing?.designId === activeDesign.id
      ? (activeDesign.nodes.find((n) => n.id === viewing.nodeId) ?? null)
      : null;

  const handleGraphChange = (graph: DesignGraph) => {
    if (activeDesign) void updateGraph(projectPath, activeDesign.id, graph);
  };

  if (!activeDesign) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 bg-background text-text-secondary/40">
        <Palette className="h-12 w-12" strokeWidth={1} />
        <p className="text-sm">Select or create a design</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
      {viewingNode ? (
        <DesignViewer
          projectPath={projectPath}
          design={activeDesign}
          node={viewingNode}
          onBack={() => setViewing(null)}
          onNavigate={(nodeId) => setViewing({ designId: activeDesign.id, nodeId })}
        />
      ) : (
        <DesignCanvas
          key={activeDesign.id}
          projectPath={projectPath}
          designId={activeDesign.id}
          nodes={activeDesign.nodes}
          edges={activeDesign.edges}
          onOpen={(nodeId) => setViewing({ designId: activeDesign.id, nodeId })}
          onGraphChange={handleGraphChange}
        />
      )}
    </div>
  );
}

export default Design;