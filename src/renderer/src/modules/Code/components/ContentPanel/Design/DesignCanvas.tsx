import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { getDesignPageUrl } from './designUrl';
import type { DesignEdge, DesignGraph, DesignNode } from '../../../hooks/useDesignStore';

interface DesignCanvasProps {
  projectPath: string;
  designId: string;
  nodes: DesignNode[];
  edges: DesignEdge[];
  onOpen: (nodeId: string) => void;
  onGraphChange: (graph: DesignGraph) => void;
}

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

export function DesignCanvas({
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
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;

    if (drag.kind === 'pan') {
      setOffset({ x: drag.origX + dx, y: drag.origY + dy });
      return;
    }

    if (!drag.moved && Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
    drag.moved = true;
    const next = nodesRef.current.map((n) =>
      n.id === drag.id ? { ...n, x: drag.origX + dx, y: drag.origY + dy } : n,
    );
    nodesRef.current = next;
    setLocalNodes(next);
  };

  const endDrag = () => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag || drag.kind !== 'node') return;
    if (drag.moved) onGraphChange({ nodes: nodesRef.current, edges });
    else onOpen(drag.id);
  };

  const byId = new Map(localNodes.map((n) => [n.id, n]));

  return (
    <div
      className="relative flex-1 cursor-grab select-none overflow-hidden bg-background active:cursor-grabbing"
      style={{
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
        backgroundPosition: `${offset.x}px ${offset.y}px`,
      }}
      onMouseDown={(e) => {
        if (e.target !== e.currentTarget) return;
        dragRef.current = {
          kind: 'pan',
          startX: e.clientX,
          startY: e.clientY,
          origX: offset.x,
          origY: offset.y,
        };
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={endDrag}
      onMouseLeave={endDrag}
    >
      <div
        className="pointer-events-none absolute left-0 top-0"
        style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
      >
        <svg className="absolute left-0 top-0 overflow-visible" width={1} height={1}>
          <defs>
            <marker
              id="design-arrow"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="8"
              markerHeight="8"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" className="fill-primary" />
            </marker>
          </defs>
          {edges.map((edge) => {
            const from = byId.get(edge.from);
            const to = byId.get(edge.to);
            if (!from || !to) return null;
            return (
              <path
                key={edge.id}
                d={edgePath(from, to)}
                fill="none"
                className="stroke-primary/70"
                strokeWidth={2}
                strokeDasharray="6 5"
                markerEnd="url(#design-arrow)"
              />
            );
          })}
        </svg>

        {localNodes.map((node) => (
          <div
            key={node.id}
            onMouseDown={(e) => {
              e.stopPropagation();
              dragRef.current = {
                kind: 'node',
                id: node.id,
                startX: e.clientX,
                startY: e.clientY,
                origX: node.x,
                origY: node.y,
                moved: false,
              };
            }}
            className="pointer-events-auto absolute cursor-pointer overflow-hidden rounded-xl border border-border bg-card-background shadow-lg transition-colors hover:border-primary/60"
            style={{ left: node.x, top: node.y, width: NODE_WIDTH, height: NODE_HEIGHT }}
          >
            <NodePreview projectPath={projectPath} designId={designId} file={node.file} />
            <div className="p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium text-text-primary">{node.name}</p>
                <span className="shrink-0 rounded bg-primary/15 px-1.5 py-0.5 font-mono text-[10px] text-primary">
                  {node.route}
                </span>
              </div>
              <p className="mt-0.5 truncate font-mono text-[11px] text-text-secondary/70">{node.file}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DesignCanvas;