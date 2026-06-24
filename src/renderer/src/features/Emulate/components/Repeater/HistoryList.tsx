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
  endTime?: number;
  duration: number;
  payload: string;
  payloadCount?: number;
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
  payloads?: Array<{ id: string; name: string; values: string[]; enabled: boolean }>;
  onSwitchToResult?: () => void;
  onViewResponse?: (entry: HistoryEntry) => void;
}

export function HistoryList({ 
  entries, 
  onSelect, 
  onClear, 
  onDelete, 
  selectedId,
  payloads = [],
  onSwitchToResult,
  onViewResponse
}: HistoryListProps) {
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

  const formatDateLabel = (timestamp: number): string => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const todayStr = today.toLocaleDateString('en-GB');
    const yesterdayStr = yesterday.toLocaleDateString('en-GB');
    const dateStr = date.toLocaleDateString('en-GB');
    
    if (dateStr === todayStr) return `Today ${dateStr}`;
    if (dateStr === yesterdayStr) return `Yesterday ${dateStr}`;
    return dateStr;
  };

  const getUrlPath = (url: string): string => {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname || url;
    } catch {
      return url.split('?')[0] || url;
    }
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

      <div className="flex-1 overflow-auto p-2">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-secondary">
            <Clock className="w-8 h-8 mb-2 opacity-20" />
            <span className="text-xs">No history yet</span>
            <span className="text-[10px] opacity-60 mt-1">Execute requests to see them here</span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Group by date */}
            {(() => {
              const groups: { [key: string]: HistoryEntry[] } = {};
              entries.forEach(entry => {
                const label = formatDateLabel(entry.timestamp);
                if (!groups[label]) groups[label] = [];
                groups[label].push(entry);
              });
              
              return Object.entries(groups).map(([label, groupEntries]) => (
                <div key={label} className="space-y-1">
                  <div className="text-[10px] font-bold text-text-secondary uppercase px-2 py-1">
                    {label}
                  </div>
                  {groupEntries.map((entry) => {
                    const isExpanded = expandedIds.has(entry.id);
                    const isSelected = selectedId === entry.id;
                    const methodColor = methodColors[entry.method?.toUpperCase()] || 'text-text-secondary';
                    const hasPayload = entry.payload && entry.payload.length > 0;
                    const urlPath = getUrlPath(entry.url);
                    const startTime = formatTime(entry.timestamp);
                    const endTime = entry.endTime ? formatTime(entry.endTime) : startTime;

                    const handleCardClick = () => {
                      if (hasPayload && onSwitchToResult) {
                        onSwitchToResult();
                      } else if (onViewResponse) {
                        onViewResponse(entry);
                      } else {
                        onSelect(entry);
                      }
                    };

                    return (
                      <div
                        key={entry.id}
                        className={cn(
                          'rounded-md border transition-all cursor-pointer',
                          isSelected
                            ? 'border-primary/50 bg-primary/5'
                            : 'border-border hover:border-border-hover bg-background hover:bg-dropdown-item-hover/30',
                          isExpanded && 'border-primary/30'
                        )}
                        onClick={handleCardClick}
                      >
                        <div className="px-3 py-2 space-y-1.5">
                          {/* Row 1: Method + URL + Status */}
                          <div className="flex items-center gap-2">
                            <span className={cn('font-mono font-bold text-xs shrink-0', methodColor)}>
                              {entry.method}
                            </span>
                            <span className="flex-1 text-xs text-text-primary font-mono truncate">
                              {urlPath}
                            </span>
                            <StatusBadge status={entry.status} />
                          </div>

                          {/* Row 2: Time + Duration + Payload count */}
                          <div className="flex items-center gap-3 text-[10px] text-text-secondary">
                            <span>🕐 {startTime} - {endTime}</span>
                            <span>⏱ {entry.duration}ms</span>
                            {hasPayload && (
                              <span className="text-primary">📦 {entry.payloadCount || 1} values</span>
                            )}
                            {!hasPayload && (
                              <span className="text-text-secondary opacity-50">No payload</span>
                            )}
                          </div>

                          {/* Row 3: Delete button */}
                          <div className="flex items-center justify-end pt-0.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('Delete this entry?')) {
                                  onDelete(entry.id);
                                }
                              }}
                              className="p-0.5 rounded hover:bg-error/10 text-text-secondary hover:text-error transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ));
            })()}
          </div>
        )}
      </div>
    </div>
  );
}