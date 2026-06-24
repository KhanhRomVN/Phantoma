import { useMemo } from 'react';
import { cn } from '../../../../shared/lib/utils';
import { NetworkRequest } from '../Home/Filter';
import { StatusBadge } from '../common/StatusBadge';

interface RequestListProps {
  requests: NetworkRequest[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

export function RequestList({ requests, selectedId, onSelect, searchTerm }: RequestListProps) {
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

  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-1">
      {filtered.map((req) => {
        const isSelected = selectedId === req.id;
        const methodColor =
          {
            GET: 'text-emerald-400',
            POST: 'text-blue-400',
            PUT: 'text-amber-400',
            DELETE: 'text-red-400',
            PATCH: 'text-purple-400',
          }[req.method?.toUpperCase() || ''] || 'text-text-secondary';

        return (
          <div
            key={req.id}
            onClick={() => onSelect(req.id)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-all text-xs',
              isSelected
                ? 'bg-card-background border border-border'
                : 'hover:bg-card-hover border border-transparent',
            )}
          >
            <span className={cn('font-mono font-bold w-10 shrink-0', methodColor)}>
              {req.method || 'GET'}
            </span>
            <span className="flex-1 truncate text-text-primary">{req.path || req.url}</span>
            {req.status && <StatusBadge status={req.status} />}
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
    </div>
  );
}
