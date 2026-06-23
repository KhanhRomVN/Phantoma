import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { Zap, X, Search, Send } from 'lucide-react';
import { cn } from '../../../../shared/lib/utils';
import { NetworkRequest } from '../Home/Filter';
import { StatusBadge } from '../common/StatusBadge';
import { FuzzerJob, FuzzerResult } from './types';
import { RequestList } from './RequestList';
import { PayloadConfigPanel } from './PayloadConfigPanel';
import { generatePayloads, parseHeaders, applyPayload } from './utils';

const REPEATER_STORAGE_KEY = 'repeater-request-ids';

// Load request IDs that have been sent to Repeater
const loadRepeaterIds = (): Set<string> => {
  try {
    const data = localStorage.getItem(REPEATER_STORAGE_KEY);
    if (data) {
      const arr = JSON.parse(data);
      return new Set(arr);
    }
  } catch {}
  return new Set();
};

// Save request IDs to localStorage
const saveRepeaterIds = (ids: Set<string>) => {
  try {
    localStorage.setItem(REPEATER_STORAGE_KEY, JSON.stringify([...ids]));
  } catch {}
};

// Add a request to Repeater
export const addToRepeater = (requestId: string) => {
  const ids = loadRepeaterIds();
  ids.add(requestId);
  saveRepeaterIds(ids);
  // Dispatch event to notify components
  window.dispatchEvent(new CustomEvent('repeater-updated'));
};

// Check if a request is in Repeater
export const isInRepeater = (requestId: string): boolean => {
  const ids = loadRepeaterIds();
  return ids.has(requestId);
};

// Get all request IDs in Repeater
export const getRepeaterIds = (): Set<string> => {
  return loadRepeaterIds();
};

// Remove a request from Repeater
export const removeFromRepeater = (requestId: string) => {
  const ids = loadRepeaterIds();
  ids.delete(requestId);
  saveRepeaterIds(ids);
  window.dispatchEvent(new CustomEvent('repeater-updated'));
};

// Clear all requests from Repeater
export const clearRepeater = () => {
  saveRepeaterIds(new Set());
  window.dispatchEvent(new CustomEvent('repeater-updated'));
};

interface PayloadPanelProps {
  requests?: NetworkRequest[];
  isTargetRunning?: boolean;
  onClose?: () => void;
  selectedRequestId?: string | null;
}

export function PayloadPanel({
  requests = [],
  isTargetRunning = false,
  onClose,
  selectedRequestId,
}: PayloadPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<FuzzerResult[]>([]);
  const [repeaterIds, setRepeaterIds] = useState<Set<string>>(loadRepeaterIds());
  const stopRef = useRef(false);

  // Listen for repeater updates
  useEffect(() => {
    const handleUpdate = () => {
      setRepeaterIds(loadRepeaterIds());
    };
    window.addEventListener('repeater-updated', handleUpdate);
    return () => window.removeEventListener('repeater-updated', handleUpdate);
  }, []);

  // Filter requests to only show those in Repeater
  const repeaterRequests = useMemo(() => {
    return requests.filter((req) => repeaterIds.has(req.id));
  }, [requests, repeaterIds]);

  // Get selected request
  const selectedRequest = useMemo(() => {
    if (!selectedId) return null;
    return repeaterRequests.find((r) => r.id === selectedId) || null;
  }, [repeaterRequests, selectedId]);

  // Auto-select: first try selectedRequestId from props, then fallback to first request
  useEffect(() => {
    if (repeaterRequests.length === 0) {
      setSelectedId(null);
      return;
    }

    if (selectedRequestId && repeaterRequests.some((r) => r.id === selectedRequestId)) {
      setSelectedId(selectedRequestId);
      return;
    }

    if (!selectedId || !repeaterRequests.some((r) => r.id === selectedId)) {
      setSelectedId(repeaterRequests[0].id);
    }
  }, [repeaterRequests, selectedRequestId]);

  // Run fuzzer/repeater
  const handleRun = async (form: Omit<FuzzerJob, 'id' | 'createdAt'>) => {
    if (isRunning) {
      stopRef.current = true;
      return;
    }

    const job: FuzzerJob = {
      ...form,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      requestId: selectedId || undefined,
    };

    stopRef.current = false;
    setIsRunning(true);
    setResults([]);

    const payloads = [...generatePayloads(job)];
    const concurrency = Math.min(job.concurrency, 10);
    let idx = 0;

    const runOne = async (payload: string, i: number): Promise<FuzzerResult> => {
      const url = applyPayload(job.urlTemplate, payload);
      const body = applyPayload(job.bodyTemplate, payload);
      const headers = parseHeaders(applyPayload(job.headersTemplate, payload));
      const t0 = performance.now();
      try {
        const res = await (window as any).api.invoke('inspector:send-request', {
          url,
          method: job.method,
          headers,
          body: job.method !== 'GET' ? body : undefined,
        });
        return {
          index: i,
          payload,
          status: res.status ?? 0,
          time: Math.round(performance.now() - t0),
          size: res.size ?? 0,
        };
      } catch {
        return { index: i, payload, status: 0, time: Math.round(performance.now() - t0), size: 0 };
      }
    };

    while (idx < payloads.length && !stopRef.current) {
      const chunk = payloads.slice(idx, idx + concurrency);
      const chunkResults = await Promise.all(chunk.map((p, ci) => runOne(p, idx + ci)));
      setResults((prev) => [...prev, ...chunkResults]);
      idx += concurrency;
    }

    setIsRunning(false);
  };

  const totalCount = repeaterRequests.length;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left Panel - Request List */}
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

        <div className="flex items-center justify-between px-3 py-1 border-b border-border shrink-0">
          <span className="text-[10px] text-text-secondary">
            {totalCount} request{totalCount !== 1 ? 's' : ''} in Repeater
          </span>
          {totalCount > 0 && (
            <button
              onClick={clearRepeater}
              className="text-[10px] text-text-secondary hover:text-error transition-colors"
            >
              Clear all
            </button>
          )}
        </div>

        {results.length > 0 && (
          <div className="flex items-center justify-end px-3 py-1 border-b border-border shrink-0">
            <button
              onClick={() => setResults([])}
              className="text-[10px] text-text-secondary hover:text-text-primary"
            >
              Clear results
            </button>
          </div>
        )}

        <RequestList
          requests={repeaterRequests}
          selectedId={selectedId}
          onSelect={setSelectedId}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
        />
      </div>

      {/* Right Panel - Payload Configuration */}
      <div className="flex-1 flex flex-col min-w-0 bg-muted/5">
        <div className="px-4 h-10 border-b border-border shrink-0 flex items-center justify-between bg-muted/5">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-medium text-text-primary">Payload Configuration</span>
            {selectedRequest && (
              <span className="text-xs text-text-secondary ml-2 truncate max-w-[200px]">
                {selectedRequest.path || selectedRequest.url}
              </span>
            )}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded text-text-secondary hover:text-red-400 hover:bg-red-500/10"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {!selectedRequest ? (
          <div className="flex-1 flex flex-col items-center justify-center text-text-secondary">
            <Send className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm">Select a request to configure payload</p>
            <p className="text-xs mt-1 opacity-60">
              Right-click a request and select "Send to Repeater"
            </p>
          </div>
        ) : (
          <PayloadConfigPanel request={selectedRequest} onRun={handleRun} isRunning={isRunning} />
        )}

        {/* Results Summary */}
        {results.length > 0 && (
          <div className="border-t border-border shrink-0 bg-muted/5 max-h-40 overflow-y-auto">
            <div className="px-3 py-1.5 border-b border-border flex items-center gap-3">
              <span className="text-[10px] font-medium text-text-secondary">
                Results: {results.length} requests
              </span>
              <span className="text-[10px] text-text-secondary">
                {results.filter((r) => r.status >= 200 && r.status < 300).length} success
              </span>
              <span className="text-[10px] text-text-secondary">
                {results.filter((r) => r.status >= 400).length} errors
              </span>
            </div>
            <div className="p-2 space-y-0.5">
              {results.slice(0, 50).map((r) => (
                <div key={r.index} className="flex items-center gap-3 text-xs">
                  <span className="text-text-secondary w-8">#{r.index + 1}</span>
                  <span className="font-mono text-text-primary truncate flex-1">{r.payload}</span>
                  <StatusBadge status={r.status} />
                  <span className="text-text-secondary w-14 text-right">{r.time}ms</span>
                </div>
              ))}
              {results.length > 50 && (
                <div className="text-[10px] text-text-secondary text-center">
                  + {results.length - 50} more results
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PayloadPanel;