import { useState } from 'react';
import { Trash2, ChevronDown, ChevronRight, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '../../../../shared/lib/utils';
import { StatusBadge } from '../common/StatusBadge';

interface HistoryEntry {
  id: string;
  method: string;
  url: string;
  status: number;
  timestamp: number;
  duration: number;
  payload: string;
  requestHeaders?: Record<string, string>;
  requestBody?: string;
  responseHeaders?: Record<string, string>;
  responseBody?: string;
}

interface HistoryListProps {
  entries: HistoryEntry[];
  onSelect: (entry: HistoryEntry) => void;
  onClear: () => void;
  onDelete: (id: string) => void;
  selectedId?: string | null;
}

export function HistoryList({ entries, onSelect, onClear, onDelete, selectedId }: HistoryListProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getStatusIcon = (status: number) => {
    if (status >= 200 && status < 300) return <CheckCircle className="w-3.5 h-3.5 text-success" />;
    if (status >= 400) return <XCircle className="w-3.5 h-3.5 text-error" />;
    return <AlertCircle className="w-3.5 h-3.5 text-warning" />;
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const methodColors: Record<string, string> = {
    GET: 'text-blue-400',
    POST: 'text-green-400',
    PUT: 'text-amber-400',
    DELETE: 'text-red-400',
    PATCH: 'text-purple-400',
    HEAD: 'text-gray-400',
    OPTIONS: 'text-cyan-400',
  };

  return (
    <div className="flex flex-col h-full">
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

      <div className="flex-1 overflow-auto">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-secondary">
            <Clock className="w-8 h-8 mb-2 opacity-20" />
            <span className="text-xs">No history yet</span>
            <span className="text-[10px] opacity-60 mt-1">Execute requests to see them here</span>
          </div>
        ) : (
          <div className="space-y-0.5 p-1">
            {entries.map((entry) => {
              const isExpanded = expandedIds.has(entry.id);
              const isSelected = selectedId === entry.id;
              const methodColor = methodColors[entry.method?.toUpperCase()] || 'text-text-secondary';

              return (
                <div
                  key={entry.id}
                  className={cn(
                    'rounded-md border transition-all',
                    isSelected
                      ? 'border-primary/50 bg-primary/5'
                      : 'border-border hover:border-border-hover bg-background',
                    isExpanded && 'border-primary/30'
                  )}
                >
                  <div
                    className={cn(
                      'flex items-center gap-2 px-2 py-1.5 cursor-pointer transition-colors',
                      !isSelected && 'hover:bg-dropdown-item-hover/30'
                    )}
                    onClick={() => {
                      onSelect(entry);
                      toggleExpand(entry.id);
                    }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(entry.id);
                      }}
                      className="p-0.5 text-text-secondary hover:text-text-primary"
                    >
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </button>

                    <span className={cn('font-mono font-bold text-xs w-12 shrink-0', methodColor)}>
                      {entry.method}
                    </span>

                    <span className="flex-1 truncate text-xs text-text-primary font-mono">
                      {entry.url}
                    </span>

                    <span className="text-[10px] text-text-secondary shrink-0">
                      {formatTime(entry.timestamp)}
                    </span>

                    <StatusBadge status={entry.status} />

                    <span className="text-[10px] text-text-secondary shrink-0">
                      {entry.duration}ms
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Delete this entry?')) {
                          onDelete(entry.id);
                        }
                      }}
                      className="p-0.5 rounded hover:bg-error/10 text-text-secondary hover:text-error transition-colors shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="px-2 pb-2 pt-0.5 border-t border-border/50 space-y-1.5">
                      {entry.payload && (
                        <div>
                          <span className="text-[10px] font-bold text-text-secondary">Payload: </span>
                          <span className="text-xs font-mono text-text-primary break-all">{entry.payload}</span>
                        </div>
                      )}

                      {entry.requestHeaders && Object.keys(entry.requestHeaders).length > 0 && (
                        <div>
                          <span className="text-[10px] font-bold text-text-secondary">Request Headers: </span>
                          <span className="text-xs font-mono text-text-primary break-all">
                            {Object.entries(entry.requestHeaders)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(', ')}
                          </span>
                        </div>
                      )}

                      {entry.requestBody && (
                        <div>
                          <span className="text-[10px] font-bold text-text-secondary">Request Body: </span>
                          <pre className="text-xs font-mono text-text-primary bg-input-background rounded p-1 mt-0.5 overflow-auto max-h-32">
                            {entry.requestBody}
                          </pre>
                        </div>
                      )}

                      {entry.responseHeaders && Object.keys(entry.responseHeaders).length > 0 && (
                        <div>
                          <span className="text-[10px] font-bold text-text-secondary">Response Headers: </span>
                          <span className="text-xs font-mono text-text-primary break-all">
                            {Object.entries(entry.responseHeaders)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(', ')}
                          </span>
                        </div>
                      )}

                      {entry.responseBody && (
                        <div>
                          <span className="text-[10px] font-bold text-text-secondary">Response Body: </span>
                          <pre className="text-xs font-mono text-text-primary bg-input-background rounded p-1 mt-0.5 overflow-auto max-h-32">
                            {entry.responseBody}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}