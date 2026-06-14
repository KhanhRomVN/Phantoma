import { useState, useEffect } from 'react';
import { RequestTable } from './RequestTable';
import { NetworkRequest, WebSocketConnection } from '../../../../../types/inspector';
import { InspectorFilter, initialFilterState } from '../RequestDetails/Filter';
import { useI18n } from '../../../../../i18n/i18nContext';

interface RequestListProps {
  filteredRequests: NetworkRequest[];
  requests: NetworkRequest[];
  selectedId: string | null;
  onSelectRequest: (id: string | null) => void;
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  interceptedIds: Set<string>;
  pendingActionIds: Set<string>;
  onForward: (id: string) => void;
  onDrop: (id: string) => void;
  onDeleteRequest: (id: string) => void;
  appId: string;
  onSetCompare1: (req: NetworkRequest | null) => void;
  onSetCompare2: (req: NetworkRequest | null) => void;
  setFilter: (filter: InspectorFilter) => void;
  onAnalyzeRequest?: (req: NetworkRequest) => void;
  onSendToFuzzer?: (req: NetworkRequest) => void;
  onSelectionChange?: (selectedIds: string[]) => void;
  // WebSocket
  wsConnections: WebSocketConnection[];
  selectedWsId: string | null;
  onSelectWsConnection: (id: string | null) => void;
  onDeleteWsConnection: (id: string) => void;
  // BrowserView
  browserViewUrl: string | null;
}

export function RequestList({
  filteredRequests,
  requests,
  selectedId,
  onSelectRequest,
  searchTerm,
  onSearchTermChange,
  interceptedIds,
  pendingActionIds,
  onForward,
  onDrop,
  onDeleteRequest,
  appId,
  onSetCompare1,
  onSetCompare2,
  setFilter,
  onAnalyzeRequest,
  onSendToFuzzer,
  onSelectionChange,

  browserViewUrl,
}: RequestListProps) {
  const [view, setView] = useState<'table' | 'timeline' | 'websocket' | 'browser'>('table');
  const { t } = useI18n();

  // Auto-switch to browser view when URL is set from Target selector
  useEffect(() => {
    if (browserViewUrl) {
      setView('browser');
    }
  }, [browserViewUrl]);

  return (
    <div className="h-full flex">
      {/* Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {view === 'table' && filteredRequests.length === 0 && requests.length > 0 && (
          <div className="p-4 bg-warning/10 text-warning text-xs text-center border-b border-warning/20 shrink-0">
            {t.requestList.allHidden.replace('{count}', String(requests.length))}
            <button
              onClick={() => setFilter({ ...initialFilterState })}
              className="ml-2 underline hover:text-warning"
            >
              {t.requestList.resetFilters}
            </button>
          </div>
        )}
        <RequestTable
          requests={filteredRequests}
          selectedId={selectedId}
          onSelect={(id) => onSelectRequest(id)}
          searchTerm={searchTerm}
          onSearchChange={onSearchTermChange}
          interceptedIds={interceptedIds}
          pendingActionIds={pendingActionIds}
          onForward={onForward}
          onDrop={onDrop}
          onDelete={onDeleteRequest}
          appId={appId || 'unknown'}
          onSetCompare1={onSetCompare1}
          onSetCompare2={onSetCompare2}
          onAnalyzeRequest={onAnalyzeRequest}
          onSendToFuzzer={onSendToFuzzer}
          onSelectionChange={onSelectionChange}
        />
      </div>
    </div>
  );
}
