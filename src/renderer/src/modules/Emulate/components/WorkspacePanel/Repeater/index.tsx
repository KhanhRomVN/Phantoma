import { useState, useEffect, useMemo } from 'react';
import { logger } from '@renderer/utils/logger';
import { Search } from 'lucide-react';

// ── Components ──
import { RequestPanel } from './WorkspacePanel/RequestPanel';
import { RequestList } from './RequestList';

// ── Types ──
import type { HistoryEntry } from '../../../types/repeater.types';
import type { NetworkRequest } from '../Home/FilterPanel';

// Services
import emulateApi, { RepeaterRequest } from '../../../services/emulate-api.service';

/**
 * Add request to repeater by creating a DB record.
 * @param request - NetworkRequest object containing method, url, headers, body
 * @param targetId - Target ID
 */
export const addToRepeater = async (
  request: NetworkRequest,
  targetId: string,
): Promise<boolean> => {
  try {
    // Parse headers từ NetworkRequest format
    let headers: any[] = [];
    if (request.requestHeaders) {
      headers = Object.entries(request.requestHeaders).map(([key, value]) => ({
        id: crypto.randomUUID(),
        key,
        value,
        enabled: true,
      }));
    }

    const res = await emulateApi.createRequest(targetId, {
      method: request.method,
      url: request.url,
      body: request.requestBody || '',
      params: '[]', // Default empty params
      headers: JSON.stringify(headers),
    });

    if (res.success) {
      window.dispatchEvent(new CustomEvent('repeater-updated'));
      return true;
    } else {
      logger.error('[addToRepeater] Failed to create request:', res.error);
      return false;
    }
  } catch (err) {
    logger.error('[addToRepeater] Error:', err);
    return false;
  }
};

/**
 * Check if request exists in repeater by querying DB.
 */
export const isInRepeater = async (requestId: string, targetId: string): Promise<boolean> => {
  try {
    const res = await emulateApi.listRequests(targetId);
    if (res.success && res.data) {
      return res.data.some((r: any) => r.id === requestId);
    }
    return false;
  } catch {
    return false;
  }
};

/**
 * Get all repeater IDs from DB.
 */
export const getRepeaterIds = async (targetId: string): Promise<Set<string>> => {
  try {
    const res = await emulateApi.listRequests(targetId);
    if (res.success && res.data) {
      return new Set(res.data.map((r: any) => r.id));
    }
    return new Set();
  } catch {
    return new Set();
  }
};

/**
 * Remove request from repeater by deleting DB record.
 */
export const removeFromRepeater = async (requestId: string, targetId: string): Promise<boolean> => {
  try {
    await emulateApi.deleteRequest(targetId, requestId);
    window.dispatchEvent(new CustomEvent('repeater-updated'));
    return true;
  } catch (err) {
    logger.error('[removeFromRepeater] Error:', err);
    return false;
  }
};

/**
 * Clear all repeater requests for a target.
 */
export const clearRepeater = async (targetId: string): Promise<void> => {
  try {
    const res = await emulateApi.listRequests(targetId);
    if (res.success && res.data) {
      for (const req of res.data) {
        await emulateApi.deleteRequest(targetId, req.id);
      }
    }
    window.dispatchEvent(new CustomEvent('repeater-updated'));
  } catch (err) {
    logger.error('[clearRepeater] Error:', err);
  }
};

// Map API RepeaterRequest to NetworkRequest for RequestList display
const mapDbToNetworkRequest = (r: RepeaterRequest): NetworkRequest => {
  let host = '';
  let path = '';
  try {
    host = new URL(r.url).host;
  } catch {
    logger.warn('[Repeater] Invalid URL host:', r.url);
  }
  try {
    path = new URL(r.url).pathname + new URL(r.url).search;
  } catch {
    logger.warn('[Repeater] Invalid URL path:', r.url);
  }

  let requestHeaders: Record<string, string> = {};
  try {
    const parsed = r.headers ? JSON.parse(r.headers) : [];
    if (Array.isArray(parsed)) {
      // Headers từ DB là array: [{key, value, enabled}]
      requestHeaders = Object.fromEntries(
        parsed
          .filter((h: any) => h.enabled !== false) // Chỉ lấy enabled headers
          .map((h: any) => [h.key, h.value]),
      );
    } else if (parsed && typeof parsed === 'object') {
      // Fallback: nếu là object {key: value}
      requestHeaders = Object.fromEntries(
        Object.entries(parsed).map(([key, value]) => [key, String(value)]),
      );
    }
  } catch (err) {
    logger.warn('[Repeater] Failed to parse request headers:', r.headers, err);
  }

  return {
    id: r.id,
    method: r.method,
    url: r.url,
    host,
    path,
    protocol: '',
    type: '',
    timestamp: r.created_at * 1000,
    requestHeaders,
    requestBody: r.body || '',
  } as NetworkRequest;
};

interface PayloadPanelProps {
  isTargetRunning?: boolean;
  onClose?: () => void;
  selectedRequestId?: string | null;
  targetId?: string | null;
}

export function PayloadPanel({ selectedRequestId, targetId, isTargetRunning }: PayloadPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dbRequests, setDbRequests] = useState<NetworkRequest[]>([]);
  const [lastRunTimestamp, setLastRunTimestamp] = useState<number | null>(null);
  const [saveToHistory, setSaveToHistory] = useState(true);

  // Load repeater requests from DB
  const loadDbRequests = async () => {
    if (!targetId || !isTargetRunning) {
      setDbRequests([]);
      return;
    }

    try {
      const res = await emulateApi.listRequests(targetId);
      if (res.success && res.data) {
        const mapped = res.data.map(mapDbToNetworkRequest);
        setDbRequests(mapped);
        if (mapped.length > 0 && !selectedId) {
          setSelectedId(mapped[0].id);
        }
      }
    } catch (err) {
      logger.error('[PayloadPanel] Failed to load requests:', err);
    }
  };

  useEffect(() => {
    loadDbRequests();
  }, [targetId, isTargetRunning]);

  // Listen for repeater-updated event with debounce to prevent duplicate loads
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;

    const handleUpdate = () => {
      // Debounce: wait 100ms before reloading to batch multiple events
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        loadDbRequests();
      }, 100);
    };

    window.addEventListener('repeater-updated', handleUpdate);
    return () => {
      window.removeEventListener('repeater-updated', handleUpdate);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [targetId, isTargetRunning]);

  // Merge network requests (in-memory) with DB requests
  const allRequests = useMemo(() => {
    // Only show DB requests since that's the source of truth
    return dbRequests;
  }, [dbRequests]);

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
  };

  const handleRemoveRequest = async (id: string) => {
    if (!targetId) return;

    try {
      await emulateApi.deleteRequest(targetId, id);
      setDbRequests((prev) => prev.filter((r) => r.id !== id));
      window.dispatchEvent(new CustomEvent('repeater-updated'));
    } catch (error) {
      logger.error('[Repeater] Failed to delete request:', error);
    }
  };

  return (
    <div className="flex h-full overflow-hidden">
      <div className="w-80 shrink-0 border-r border-border flex flex-col bg-background">
        <div className="border-b border-border shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
            <input
              type="text"
              placeholder="Search repeater requests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-9 bg-input-background border border-input-border-default rounded-md pl-8 pr-3 text-sm text-text-primary focus:border-amber-500/50 outline-none"
            />
          </div>
        </div>
        <RequestList
          requests={allRequests}
          selectedId={selectedId}
          onSelect={handleSelectRequest}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onRemoveRequest={handleRemoveRequest}
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
          />
        )}
      </div>
    </div>
  );
}

export default PayloadPanel;
