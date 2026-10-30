import React, { useState } from 'react';
import { icons } from 'lucide-react';
import type { RenderedBox } from './types';
import KvView from './Kv/Kv';
import TableView from './Table/Table';
import TimelineView from './Timeline/Timeline';
import ChecklistView from './Checklist/Checklist';
import GraphView from './Graph/Graph';
import CodeView from './Code/Code';
import MarkdownView from './Markdown/Markdown';
import { FileManager, configFromOptions } from './FileManager';

import CalloutView from './Callout/Callout';
import QuoteView from './Quote/Quote';
import AnnotationView from './Annotation/Annotation';
import MapView, { type MapMode } from './Map/Map';
import DonutView from './Donut/Donut';
import BarLineView, { BarLineLegend } from './BarLine/BarLine';
import StatView from './Stat/Stat';
import TagsView from './Tags/Tags';
import PinView from './Pin/Pin';
import HeatmapView from './Heatmap/Heatmap';
import DiffView from './Diff/Diff';
import { cn } from '@renderer/shared/utils/cn';
import { withAlpha } from '../targetType';

interface Props {
  box: RenderedBox;
}

const CELL_HEIGHT = 36; // px per row unit (spec suggestion 36-40)

const mapRowsFor = (w: number): number => Math.min(w, w % 2 === 0 ? 8 : 7);

const BADGE_ACCENTS = ['#3686ff', '#a855f7', '#22c55e', '#f97316', '#eab308', '#ec4899', '#06b6d4'];

/** Chọn màu accent cố định theo label: nhìn ngẫu nhiên nhưng không đổi giữa các lần render. */
function accentFor(label: string): string {
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
  }
  return BADGE_ACCENTS[hash % BADGE_ACCENTS.length];
}

export default function SectionBox({ box }: Props) {
  const { label, box: cfg, data, warnings } = box;
  const [filterText, setFilterText] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const HeaderIcon = cfg.icon ? icons[cfg.icon as keyof typeof icons] : undefined;
  const SearchIcon = icons.Search;
  const MaximizeIcon = icons.Maximize2;
  const MinimizeIcon = icons.Minimize2;
  const accent = accentFor(label);
  const filterable = data.type === 'table' && cfg.options?.filterable === 'true';
  const isMap = data.type === 'map';
  const [mapMode, setMapMode] = useState<MapMode>('custom');

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);
  const isCanvas = cfg.ui === 'graph' || cfg.ui === 'map';
  const canvasRows = cfg.ui === 'map' ? mapRowsFor(cfg.w) : cfg.w;
  const style: React.CSSProperties = isCanvas
    ? {
        minHeight: `calc(${canvasRows} * var(--row-h, ${CELL_HEIGHT}px) + ${canvasRows - 1} * 1rem)`,
      }
    : cfg.maxH
      ? { maxHeight: `calc(${cfg.maxH} * var(--row-h, ${CELL_HEIGHT}px) + ${cfg.maxH - 1} * 1rem)` }
      : {};

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex flex-col bg-card-background border border-border rounded-lg overflow-hidden shadow-sm',
        warnings.length > 0 && 'border-yellow-500/50',
      )}
      style={style}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-border/50 bg-card-background-hover flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          {HeaderIcon && (
            <div
              className="w-8 h-8 rounded-md shrink-0 flex items-center justify-center"
              style={{ backgroundColor: withAlpha(accent, 0.15), color: accent }}
            >
              <HeaderIcon className="w-4 h-4" strokeWidth={2} />
            </div>
          )}
          <div className="flex flex-col min-w-0">
            <h3 className="text-sm font-semibold text-text-primary truncate">{label}</h3>
            {cfg.desc && (
              <span className="text-[11px] leading-tight text-text-secondary truncate">
                {cfg.desc}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {data.type === 'barline' && <BarLineLegend items={data.items} options={cfg.options} />}
          {filterable && (
            <div className="relative">
              <SearchIcon className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                type="text"
                placeholder="Tìm kiếm..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="w-44 h-7 bg-input-background border border-input-border-default rounded-md pl-7 pr-2 text-xs text-text-primary focus:outline-none focus:border-primary"
              />
            </div>
          )}
          {isMap && (
            <div className="flex items-center h-7 rounded-md border border-border overflow-hidden text-[11px]">
              {(['google', 'custom'] as MapMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMapMode(m)}
                  className={cn(
                    'px-2 h-full transition-colors',
                    mapMode === m
                      ? 'bg-input-background text-text-primary font-medium'
                      : 'text-text-secondary hover:bg-input-background',
                  )}
                >
                  {m === 'google' ? 'Google Map' : 'Custom Map'}
                </button>
              ))}
            </div>
          )}
          {isMap && (
            <button
              type="button"
              onClick={toggleFullscreen}
              className="w-7 h-7 rounded-md flex items-center justify-center transition-colors hover:bg-input-background"
              style={{ color: accent }}
              title={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
            >
              {isFullscreen ? (
                <MinimizeIcon className="w-4 h-4" strokeWidth={2} />
              ) : (
                <MaximizeIcon className="w-4 h-4" strokeWidth={2} />
              )}
            </button>
          )}
          {warnings.length > 0 && (
            <span className="text-[10px] text-yellow-400 cursor-help" title={warnings.join('\n')}>
              ⚠️
            </span>
          )}
        </div>
      </div>

      {/* Body - Renders specific UI based on type */}
      <div
        className={cn(
          'flex-1 relative flex flex-col',
          cfg.maxH && !isCanvas ? 'overflow-auto' : 'overflow-hidden',
        )}
      >
        {renderBody(
          data.type === 'annotation' || data.type === 'callout'
            ? { ...data, cols: Number(cfg.options?.cols) || 1 }
            : data,
          filterText,
          cfg.options,
          mapMode,
        )}
      </div>
    </div>
  );
}

function renderBody(
  data: any,
  filterText: string,
  options?: Record<string, any>,
  mapMode?: MapMode,
): React.ReactNode {
  switch (data.type) {
    case 'kv':
      return <KvView items={data.items} cols={data.cols || 1} />;
    case 'table':
      return <TableView data={data.data} filterText={filterText} />;
    case 'timeline':
      return <TimelineView events={data.events} />;
    case 'checklist':
      return <ChecklistView items={data.items} />;
    case 'graph':
      return (
        <GraphView
          nodes={data.nodes}
          edges={data.edges}
          manual={options?.source === 'manual'}
          scope={options?.scope}
        />
      );
    case 'code':
      return <CodeView content={data.content} language={options?.lang || 'plaintext'} />;
    case 'markdown':
      return <MarkdownView content={data.content} />;
    case 'callout':
      return <CalloutView items={data.items} cols={data.cols || 1} />;
    case 'quote':
      return <QuoteView items={data.items} />;
    case 'annotation':
      return <AnnotationView items={data.items} cols={data.cols || 1} />;
    case 'files':
      return <FileManager config={configFromOptions(options)} />;
    case 'map':
      return (
        <MapView
          locations={data.locations}
          regions={data.regions}
          mode={mapMode}
          title={options?.title}
          subtitle={options?.subtitle}
        />
      );
    case 'donut':
      return <DonutView items={data.items} unit={options?.unit} />;
    case 'barline':
      return (
        <BarLineView
          items={data.items}
          barColor={options?.barColor}
          lineColor={options?.lineColor}
        />
      );
    case 'stat':
      return <StatView items={data.items} variant={options?.variant} />;
    case 'tags':
      return <TagsView groups={data.groups} />;
    case 'pin':
      return <PinView file={options?.file} />;
    case 'heatmap':
      return <HeatmapView cells={data.cells} color={options?.color} />;
    case 'diff':
      return <DiffView items={data.items} />;
    case 'text':
      return <div className="p-4 text-text-primary whitespace-pre-wrap">{data.content}</div>;
    default:
      return <div className="p-4 text-red-400 text-sm">Unknown UI type: {(data as any).type}</div>;
  }
}
