import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, RotateCw } from 'lucide-react';
import { getDesignPageUrl } from './designUrl';
import { cn } from '@renderer/shared/utils/cn';
import type { DesignMeta, DesignNode } from '../../../hooks/useDesignStore';

interface DesignViewerProps {
  projectPath: string;
  design: DesignMeta;
  node: DesignNode;
  onBack: () => void;
  onNavigate: (nodeId: string) => void;
}

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

export function DesignViewer({ projectPath, design, node, onBack, onNavigate }: DesignViewerProps) {
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

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== iframeRef.current?.contentWindow) return;
      if (e.data?.type !== 'phantoma-design:navigate') return;
      const target = design.nodes.find((n) => n.route === e.data.route);
      if (target) onNavigate(target.id);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [design.nodes, onNavigate]);

  const canBack = history.index > 0;
  const canForward = history.index < history.stack.length - 1;

  const goHistory = (delta: number) => {
    const index = history.index + delta;
    const id = history.stack[index];
    if (!id) return;
    setHistory({ ...history, index });
    onNavigate(id);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const route = inputUrl.replace(/^https?:\/\/[^/]+/, '') || '/';
    const target = design.nodes.find((n) => n.route === route);
    if (target) onNavigate(target.id);
    else setInputUrl(currentUrl);
  };

  const preset = RATIOS.find((r) => r.id === ratioId) ?? RATIOS[0];
  const isFixed = preset.width > 0;
  const scale = isFixed
    ? Math.min(1, stage.w / preset.width || 0, stage.h / preset.height || 0)
    : 1;

  return (
    <div className="flex h-full w-full flex-col bg-background">
      <div className="flex h-10 shrink-0 items-stretch border-b border-divider bg-sidebar-background">
        <button
          onClick={() => (canBack ? goHistory(-1) : onBack())}
          className={navBtn}
          aria-label={canBack ? 'Previous page' : 'Back to diagram'}
          title={canBack ? 'Previous page' : 'Back to diagram'}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => goHistory(1)}
          disabled={!canForward}
          className={navBtn}
          aria-label="Next page"
          title="Next page"
        >
          <ArrowRight className="h-4 w-4" />
        </button>
        <button
          onClick={() => setStamp(Date.now())}
          className={navBtn}
          aria-label="Reload"
          title="Reload"
        >
          <RotateCw className={cn('h-4 w-4', loading && 'animate-spin')} />
        </button>

        <form onSubmit={handleSubmit} className="h-full min-w-0 flex-1">
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            spellCheck={false}
            className="h-full w-full rounded-none border-0 bg-card-background px-3 text-sm text-text-primary outline-none focus:outline-none focus:ring-0"
          />
        </form>

        <div className="relative shrink-0">
          <button
            onClick={() => setMenuOpen((open) => !open)}
            className={cn(
              'flex h-full items-center gap-2 px-3 text-xs transition-colors',
              isFixed
                ? 'bg-primary/15 text-primary'
                : 'text-text-secondary hover:bg-white/[0.05] hover:text-text-primary',
            )}
            title={preset.label}
          >
            <RatioIcon width={preset.width} height={preset.height} />
            <span className="tabular-nums">{preset.ratio}</span>
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-[9998]" onMouseDown={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full z-[9999] mt-1 min-w-[220px] rounded-lg border border-border bg-background p-1.5 shadow-xl">
                {RATIOS.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      setRatioId(r.id);
                      setMenuOpen(false);
                    }}
                    className={cn(
                      'flex h-[30px] w-full items-center gap-2.5 rounded-md px-3 text-[13px] transition-colors',
                      r.id === ratioId
                        ? 'bg-primary/15 text-primary'
                        : 'text-text-primary hover:bg-dropdown-item-hover',
                    )}
                  >
                    <RatioIcon width={r.width} height={r.height} />
                    <span className="flex-1 text-left">{r.label}</span>
                    <span className="tabular-nums text-text-secondary">{r.ratio}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div
        ref={stageRef}
        className="relative flex flex-1 items-center justify-center overflow-hidden bg-sidebar-background"
        style={{
          backgroundImage:
            'radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), repeating-linear-gradient(135deg, rgba(255,255,255,0.025) 0, rgba(255,255,255,0.025) 1px, transparent 1px, transparent 8px)',
          backgroundSize: '16px 16px, auto',
        }}
      >
        {isFixed ? (
          <div
            className="relative shrink-0 overflow-hidden"
            style={{ width: preset.width * scale, height: preset.height * scale }}
          >
            <iframe
              key={`${node.id}-${ratioId}-${stamp}`}
              ref={iframeRef}
              title={node.name}
              sandbox="allow-scripts"
              src={pageUrl}
              onLoad={() => setLoading(false)}
              className="absolute left-0 top-0 border-0 bg-white"
              style={{
                width: preset.width,
                height: preset.height,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
              }}
            />
          </div>
        ) : (
          <iframe
            key={`${node.id}-${ratioId}-${stamp}`}
            ref={iframeRef}
            title={node.name}
            sandbox="allow-scripts"
            src={pageUrl}
            onLoad={() => setLoading(false)}
            className="h-full w-full border-0 bg-white"
          />
        )}
      </div>
    </div>
  );
}

export default DesignViewer;