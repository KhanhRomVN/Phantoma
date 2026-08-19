import { useState, useEffect, useMemo } from 'react';
import { Search } from 'lucide-react';

// Components
import { RequestPanel } from './WorkspacePanel/RequestPanel';
import { RequestList } from './RequestList';

// Types
import type { HistoryEntry } from '../../../types/repeater.types';
import type { NetworkRequest } from '../Home/Filter';

// Services
import emulateApi, { RepeaterRequest } from '../../../services/emulate-api.service';

// STORE
import { useNetworkStore } from '../../../stores/networkStore';

const getStorageKey = (targetId: string | null, type: string): string => {
  const base = targetId ? `repeater-${targetId}` : 'repeater-default';
  return `${base}-${type}`;
};

const loadRepeaterIds = (targetId?: string | null): Set<string> => {
  try {
    const key = getStorageKey(targetId || null, 'request-ids');
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
};

const saveRepeaterIds = (ids: Set<string>, targetId?: string | null) => {
  const key = getStorageKey(targetId || null, 'request-ids');
  localStorage.setItem(key, JSON.stringify([...ids]));
};

export const addToRepeater = (requestId: string, targetId?: string | null) => {
  const ids = loadRepeaterIds(targetId);
  ids.add(requestId);
  saveRepeaterIds(ids, targetId);
  window.dispatchEvent(new CustomEvent('repeater-updated'));
};

export const isInRepeater = (requestId: string, targetId?: string | null): boolean => {
  const ids = loadRepeaterIds(targetId);
  return ids.has(requestId);
};

export const getRepeaterIds = (targetId?: string | null): Set<string> => {
  return loadRepeaterIds(targetId);
};

export const removeFromRepeater = (requestId: string, targetId?: string | null) => {
  const ids = loadRepeaterIds(targetId);
  ids.delete(requestId);
  saveRepeaterIds(ids, targetId);
  window.dispatchEvent(new CustomEvent('repeater-updated'));
};

export const clearRepeater = (targetId?: string | null) => {
  saveRepeaterIds(new Set(), targetId);
  window.dispatchEvent(new CustomEvent('repeater-updated'));
};

// Map API RepeaterRequest to NetworkRequest for RequestList display
const mapDbToNetworkRequest = (r: RepeaterRequest): NetworkRequest => {
  let host = '';
  let path = '';
  try {
    host = new URL(r.url).host;
  } catch {}
  try {
    path = new URL(r.url).pathname + new URL(r.url).search;
  } catch {}
  return {
    id: r.id,
    method: r.method,
    url: r.url,
    host,
    path,
    protocol: '',
    type: '',
    timestamp: r.created_at * 1000,
  } as NetworkRequest;
};

interface PayloadPanelProps {
  isTargetRunning?: boolean;
  onClose?: () => void;
  selectedRequestId?: string | null;
  targetId?: string | null;
}

export function PayloadPanel({ onClose, selectedRequestId, targetId }: PayloadPanelProps) {
  const requests = useNetworkStore((s) => s.requests);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [repeaterIds, setRepeaterIds] = useState<Set<string>>(loadRepeaterIds(targetId));
  const [lastRunTimestamp, setLastRunTimestamp] = useState<number | null>(null);
  const [saveToHistory, setSaveToHistory] = useState(true);
  const [viewHistoryEntry, setViewHistoryEntry] = useState<HistoryEntry | null>(null);
  const [dbRequests, setDbRequests] = useState<NetworkRequest[]>([]);

  useEffect(() => {
    if (!targetId) {
      setDbRequests([]);
      return;
    }
    emulateApi.listRequests(targetId).then((res) => {
      if (res.success && res.data) {
        const mapped = res.data.map(mapDbToNetworkRequest);
        setDbRequests(mapped);
        if (mapped.length > 0 && !selectedId) {
          setSelectedId(mapped[0].id);
        }
      }
    });
  }, [targetId]);

  useEffect(() => {
    const handleUpdate = () => setRepeaterIds(loadRepeaterIds(targetId));
    window.addEventListener('repeater-updated', handleUpdate);
    return () => window.removeEventListener('repeater-updated', handleUpdate);
  }, [targetId]);

  useEffect(() => {
    const currentIds = loadRepeaterIds(targetId);
    if (currentIds.size === 0) return;
    const validIds = new Set(requests.map((r) => r.id));
    const staleIds = [...currentIds].filter((id) => !validIds.has(id));
    if (staleIds.length > 0) {
      const newIds = new Set(currentIds);
      staleIds.forEach((id) => newIds.delete(id));
      saveRepeaterIds(newIds, targetId);
      setRepeaterIds(newIds);
      window.dispatchEvent(new CustomEvent('repeater-updated'));
    }
  }, [requests, targetId]);

  const allRequests = useMemo(() => {
    const networkReqs = requests.filter((req) => repeaterIds.has(req.id));
    const networkIds = new Set(networkReqs.map((r) => r.id));
    const dbOnly = dbRequests.filter((r) => !networkIds.has(r.id));
    return [...networkReqs, ...dbOnly];
  }, [requests, repeaterIds, dbRequests]);

  const selectedRequest = useMemo(() => {
    if (!selectedId) return null;
    return allRequests.find((r) => r.id === selectedId) || null;
  }, [allRequests, selectedId]);

  useEffect(() => {
    if (allRequests.length === 0) {
      setSelectedId(null);
      return;
    }
    if (selectedRequestId && allRequests.some((r) => r.id === selectedRequestId)) {
      setSelectedId(selectedRequestId);
      return;
    }
    if (!selectedId || !allRequests.some((r) => r.id === selectedId)) {
      setSelectedId(allRequests[0].id);
    }
  }, [allRequests, selectedRequestId]);

  const handleSelectRequest = (id: string) => {
    setSelectedId(id);
    setViewHistoryEntry(null);
  };
  const handleViewHistory = (entry: HistoryEntry) => setViewHistoryEntry(entry);
  const handleExitView = () => setViewHistoryEntry(null);

  return (
    <div className="flex h-full overflow-hidden">
      <div className="w-80 shrink-0 border-r border-border flex flex-col bg-background">
        <div className="px-3 py-1.5 border-b border-border shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
            <input
              type="text"
              placeholder="Search repeater requests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-8 bg-input-background border border-input-border-default rounded-md pl-8 pr-3 text-sm text-text-primary focus:border-amber-500/50 outline-none"
            />
          </div>
        </div>
        <RequestList
          requests={allRequests}
          selectedId={selectedId}
          onSelect={handleSelectRequest}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onRemoveRequest={(id) => removeFromRepeater(id, targetId)}
        />
      </div>
      <div className="flex-1 flex flex-col min-w-0 bg-muted/5">
        {allRequests.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-text-secondary">
            <p className="text-sm">No requests in Repeater</p>
            <p className="text-xs mt-1 opacity-60">
              Right-click a request and select "Send to Repeater"
            </p>
          </div>
        ) : (
          <RequestPanel
            request={selectedRequest}
            lastRunTimestamp={lastRunTimestamp}
            saveToHistory={saveToHistory}
            onSaveToggle={() => setSaveToHistory(!saveToHistory)}
            onRun={() => setLastRunTimestamp(Date.now())}
            onSaveSession={() => setLastRunTimestamp(null)}
            onSwitchTab={() => {}}
            targetId={targetId}
            viewHistoryEntry={viewHistoryEntry}
            onViewHistory={handleViewHistory}
            onExitView={handleExitView}
          />
        )}
      </div>
    </div>
  );
}

export default PayloadPanel;
