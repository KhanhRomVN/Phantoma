import { useState } from 'react';
import { Clock, Trash2, Eye } from 'lucide-react';
import { cn } from '../../../../../../../shared/lib/utils';
import { StatusBadge } from '../../../../common/StatusBadge';
import type { HistoryEntry, PayloadItem } from '../types';

interface HistoryTabProps {
  entries: HistoryEntry[];
  onSelect: (entry: HistoryEntry) => void;
  onClear: () => void;
  onDelete: (id: string) => void;
  selectedId?: string | null;
  payloads?: PayloadItem[];
  onSwitchToResult?: () => void;
  onViewResponse?: (entry: HistoryEntry) => void;
  onViewHistory?: (entry: HistoryEntry) => void;
}

function getUrlParts(url: string): { host: string; path: string } {
  try {
    const urlObj = new URL(url);
    return { host: urlObj.host, path: urlObj.pathname || url };
  } catch {
    const parts = url.split('?')[0] || url;
    return { host: '', path: parts };
  }
}

const methodColors: Record<string, string> = {
  GET: 'text-blue-400',
  POST: 'text-green-400',
  PUT: 'text-amber-400',
  DELETE: 'text-red-400',
  PATCH: 'text-purple-400',
  HEAD: 'text-gray-400',
  OPTIONS: 'text-cyan-400',
};

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function StatusCell({ entry }: { entry: HistoryEntry }) {
  if (entry.statuses && Object.keys(entry.statuses).length > 0) {
    const parts = Object.entries(entry.statuses)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([code, count]) => `${code}×${count}`);
    return (
      <span className="text-[10px] text-text-secondary" title={parts.join(', ')}>
        {parts.join(', ')}
      </span>
    );
  }
  return <StatusBadge status={entry.status} />;
}

export function HistoryTab({
  entries,
  onSelect,
  onClear,
  onDelete,
  selectedId,
  onViewHistory,
}: HistoryTabProps) {
  const [menu, setMenu] = useState<{ x: number; y: number; entryId: string } | null>(null);

  // Close context menu on any click outside
  if (menu) {
    const handler = () => setMenu(null);
    document.addEventListener('click', handler, { once: true });
  }

  const handleContextMenu = (e: React.MouseEvent, entryId: string) => {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY, entryId });
  };

  const menuEntry = menu ? entries.find((e) => e.id === menu.entryId) : null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border shrink-0 bg-table-headerBg">
        <span className="text-[10px] font-bold text-text-secondary uppercase">
          {entries.length} entry{entries.length !== 1 ? 's' : ''}
        </span>
        {entries.length > 0 && (
          <button
            onClick={onClear}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium text-error hover:bg-error/10 transition-all"
          >
            <Trash2 className="w-3 h-3" /> Clear all
          </button>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-secondary">
            <Clock className="w-8 h-8 mb-2 opacity-20" />
            <span className="text-xs">No history yet</span>
            <span className="text-[10px] opacity-60 mt-1">Execute requests to see them here</span>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10">
              <tr className="bg-table-header-background text-text-secondary">
                <th className="text-left font-semibold px-3 py-2 w-[60px]">Method</th>
                <th className="text-left font-semibold px-3 py-2">Host</th>
                <th className="text-left font-semibold px-3 py-2">Path</th>
                <th className="text-left font-semibold px-3 py-2 w-[140px]">Status</th>
                <th className="text-left font-semibold px-3 py-2">Payload</th>
                <th className="text-left font-semibold px-3 py-2 w-[80px]">Time</th>
                <th className="text-right font-semibold px-3 py-2 w-[70px]">Duration</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const { host, path: urlPath } = getUrlParts(entry.url);
                const isSelected = selectedId === entry.id;
                const methodColor =
                  methodColors[entry.method?.toUpperCase()] || 'text-text-secondary';
                const timeStr = formatTime(entry.timestamp);

                return (
                  <tr
                    key={entry.id}
                    onClick={() => onSelect(entry)}
                    onContextMenu={(e) => handleContextMenu(e, entry.id)}
                    className={cn(
                      'cursor-pointer transition-colors',
                      isSelected
                        ? 'bg-primary/10'
                        : 'hover:bg-table-row-hover',
                    )}
                  >
                    <td className="px-3 py-1.5">
                      <span className={cn('font-mono font-bold', methodColor)}>
                        {entry.method}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-text-secondary truncate max-w-[150px]">
                      {host}
                    </td>
                    <td className="px-3 py-1.5 text-text-primary font-mono truncate max-w-[300px]">
                      {urlPath}
                    </td>
                    <td className="px-3 py-1.5">
                      <StatusCell entry={entry} />
                    </td>
                    <td className="px-3 py-1.5 text-[10px] text-text-secondary truncate max-w-[140px]">
                      {entry.payload || '—'}
                    </td>
                    <td className="px-3 py-1.5 text-text-secondary whitespace-nowrap">
                      {timeStr}
                    </td>
                    <td className="px-3 py-1.5 text-text-secondary text-right whitespace-nowrap">
                      {entry.duration}ms
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Right-click context menu */}
      {menu && menuEntry && (
        <div
          className="fixed z-50 bg-background border border-border rounded-lg shadow-xl py-1 min-w-[160px]"
          style={{ left: menu.x, top: menu.y }}
        >
          {onViewHistory && (
            <button
              onClick={() => {
                onViewHistory(menuEntry);
                setMenu(null);
              }}
              className="flex items-center gap-2 w-full text-left px-3 py-1.5 text-xs text-text-primary hover:bg-dropdown-item-hover transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              View details
            </button>
          )}
          <button
            onClick={() => {
              if (confirm('Delete this entry?')) {
                onDelete(menuEntry.id);
              }
              setMenu(null);
            }}
            className="flex items-center gap-2 w-full text-left px-3 py-1.5 text-xs text-error hover:bg-error/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}