import { useEffect, useRef, useState } from 'react';
import { ExternalLink, Loader2, Trash2 } from 'lucide-react';
import { cn } from '@renderer/shared/utils/cn';
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownTrigger,
} from '@renderer/components/ui/Dropdown';
import type { DesignMeta } from '../../../hooks/useDesignStore';
import { getDesignPageUrl } from '../../ContentPanel/Design/designUrl';

interface DesignCardProps {
  projectPath: string;
  design: DesignMeta;
  active: boolean;
  onOpen: () => void;
  onDelete: () => void;
}

const FRAME_WIDTH = 1920;
const FRAME_HEIGHT = 1080;

function timeAgo(ts: number): string {
  const diff = Math.max(0, Date.now() - ts);
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function PagePreview({ projectPath, design }: { projectPath: string; design: DesignMeta }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.2);
  const [loaded, setLoaded] = useState(false);

  const node = design.nodes.find((n) => n.route === '/') ?? design.nodes[0];
  const url = node ? getDesignPageUrl(projectPath, design.id, node.file, design.updatedAt) : '';

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setScale(entry.contentRect.width / FRAME_WIDTH);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setLoaded(false);
  }, [url]);

  return (
    <div
      ref={boxRef}
      className="relative w-full overflow-hidden border-b border-divider bg-sidebar-background"
      style={{ aspectRatio: `${FRAME_WIDTH} / ${FRAME_HEIGHT}` }}
    >
      {node && (
        <iframe
          title={node.name}
          sandbox="allow-scripts"
          src={url}
          tabIndex={-1}
          scrolling="no"
          onLoad={() => setLoaded(true)}
          className="pointer-events-none absolute left-0 top-0 border-0 bg-white"
          style={{
            width: FRAME_WIDTH,
            height: FRAME_HEIGHT,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        />
      )}
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-sidebar-background text-text-secondary/50">
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
        </div>
      )}
    </div>
  );
}

export function DesignCard({ projectPath, design, active, onOpen, onDelete }: DesignCardProps) {
  return (
    <Dropdown trigger="contextmenu" className="mb-2 block w-full">
      <DropdownTrigger asChild>
        <div
          onClick={onOpen}
          className={cn(
            'relative cursor-pointer overflow-hidden rounded-xl border bg-card-background',
            active ? 'border-primary/60' : 'border-border',
          )}
        >
          <PagePreview projectPath={projectPath} design={design} />

          <div className="px-3 py-2.5">
            <p className="truncate text-xs font-semibold text-text-primary">{design.name}</p>
            {design.description && (
              <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-text-secondary">
                {design.description}
              </p>
            )}
            <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-text-secondary/70">
              <span className="rounded bg-primary/15 px-1.5 py-0.5 font-medium text-primary">
                {design.nodes.length} {design.nodes.length === 1 ? 'page' : 'pages'}
              </span>
              <span>·</span>
              <span>{timeAgo(design.updatedAt)}</span>
            </div>
          </div>
        </div>
      </DropdownTrigger>
      <DropdownContent>
        <DropdownItem icon={<ExternalLink className="h-3.5 w-3.5" />} onClick={onOpen}>
          Open
        </DropdownItem>
        <DropdownItem
          icon={<Trash2 className="h-3.5 w-3.5" />}
          variant="error"
          onClick={onDelete}
        >
          Delete
        </DropdownItem>
      </DropdownContent>
    </Dropdown>
  );
}

export default DesignCard;