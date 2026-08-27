import { useState, useMemo, useRef, useEffect } from 'react';
import { Trash2, ChevronRight, ChevronDown } from 'lucide-react';

// ── Types ──
import { NetworkRequest } from '../Home/Filter';

// ── Utils ──
import { cn } from '@renderer/shared/utils/cn';
import { getFaviconUrl } from '@renderer/shared/utils/faviconUtils';

interface RequestListProps {
  requests: NetworkRequest[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onRemoveRequest?: (id: string) => void;
}

export function RequestList({
  requests,
  selectedId,
  onSelect,
  searchTerm,
  onRemoveRequest,
}: RequestListProps) {
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    requestId: string;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [collapsedHosts, setCollapsedHosts] = useState<Set<string>>(new Set());

  // Close context menu on click outside
  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [contextMenu]);

  const filtered = useMemo(() => {
    if (!searchTerm) return requests;
    const term = searchTerm.toLowerCase();
    return requests.filter(
      (r) =>
        r.method?.toLowerCase().includes(term) ||
        r.url?.toLowerCase().includes(term) ||
        r.path?.toLowerCase().includes(term) ||
        r.host?.toLowerCase().includes(term),
    );
  }, [requests, searchTerm]);

  const grouped = useMemo(() => {
    const groups = new Map<string, NetworkRequest[]>();
    filtered.forEach((req) => {
      const host = req.host || 'Unknown';
      const list = groups.get(host) || [];
      list.push(req);
      groups.set(host, list);
    });
    const result = Array.from(groups.entries());
    return result;
  }, [filtered]);

  const toggleHost = (host: string) => {
    setCollapsedHosts((prev) => {
      const next = new Set(prev);
      if (next.has(host)) next.delete(host);
      else next.add(host);
      return next;
    });
  };

  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-1">
      {grouped.map(([host, reqs]) => {
        const isCollapsed = collapsedHosts.has(host);
        return (
          <div key={host}>
            <button
              onClick={() => toggleHost(host)}
              className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-card-hover transition-colors text-sm"
            >
              <span className="flex items-center gap-1.5 min-w-0">
                {host !== 'Unknown' && (
                  <img
                    src={getFaviconUrl(`https://${host}`, 16)}
                    alt=""
                    className="w-4 h-4 object-contain shrink-0"
                  />
                )}
                <span className="text-text-primary truncate">{host}</span>
                <span className="text-text-secondary shrink-0">({reqs.length})</span>
              </span>
              {isCollapsed ? (
                <ChevronRight className="w-3.5 h-3.5 shrink-0 text-text-secondary" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 shrink-0 text-text-secondary" />
              )}
            </button>

            {!isCollapsed && (
              <div className="pl-3 space-y-1 mt-0.5">
                {reqs.map((req) => {
                  const isSelected = selectedId === req.id;
                  const methodColor =
                    {
                      GET: 'text-emerald-400',
                      POST: 'text-amber-400',
                      PUT: 'text-blue-400',
                      PATCH: 'text-purple-400',
                      DELETE: 'text-red-400',
                      OPTIONS: 'text-text-secondary',
                      HEAD: 'text-text-secondary',
                    }[req.method?.toUpperCase() || ''] || 'text-text-secondary';

                  return (
                    <div
                      key={req.id}
                      onClick={() => onSelect(req.id)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setContextMenu({
                          x: e.clientX,
                          y: e.clientY,
                          requestId: req.id,
                        });
                      }}
                      className={cn(
                        'flex flex-col px-3 py-2 rounded-md cursor-pointer transition-all text-sm',
                        isSelected
                          ? 'bg-card-hover border border-border'
                          : 'hover:bg-card-hover border border-transparent',
                      )}
                    >
                      <div className="flex items-center gap-1 min-w-0">
                        <span className={cn('font-mono font-bold w-10 shrink-0', methodColor)}>
                          {req.method || 'GET'}
                        </span>
                        <span className="text-text-primary truncate">{req.path || req.url}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-text-secondary">
          <p className="text-sm">No requests in Repeater</p>
          <p className="text-xs mt-1 opacity-60">
            Right-click a request and select "Send to Repeater"
          </p>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && onRemoveRequest && (
        <div
          ref={menuRef}
          className="fixed z-50 bg-background border border-border rounded-lg shadow-xl py-1 min-w-[180px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={() => {
              onRemoveRequest(contextMenu.requestId);
              setContextMenu(null);
            }}
            className="flex items-center gap-2 w-full text-left px-3 py-1.5 text-xs text-error hover:bg-error/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Remove from Repeater
          </button>
        </div>
      )}
    </div>
  );
}
