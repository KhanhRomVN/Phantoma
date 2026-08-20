import { useState, useEffect, useRef, useCallback } from 'react';
import { logger } from '@renderer/utils/logger';
import { emulateApi } from '../../services/emulate-api.service';
import type { ParamItem, PayloadItem, HistoryEntry, RunResult } from '../../types/repeater.types';

interface UseRepeaterPersistenceOptions {
  targetId: string | null;
  method: string;
  url: string;
  body: string;
  params: ParamItem[];
  headers: ParamItem[];
  payloads: PayloadItem[];
  onLoadRequest?: (req: {
    method: string;
    url: string;
    body: string;
    params: ParamItem[];
    headers: ParamItem[];
    payloads: PayloadItem[];
  }) => void;
}

export function useRepeaterPersistence({ targetId, method, url, body, params, headers, payloads, onLoadRequest }: UseRepeaterPersistenceOptions) {
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>('');
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (!targetId) { setCurrentRequestId(null); hasLoadedRef.current = false; return; }
    let cancelled = false;
    setIsLoading(true);
    hasLoadedRef.current = false;
    (async () => {
      const res = await emulateApi.listRequests(targetId);
      if (cancelled) return;
      if (res.success && res.data && res.data.length > 0) {
        const req = res.data[0];
        setCurrentRequestId(req.id);
        let loadedParams: ParamItem[] = [];
        let loadedHeaders: ParamItem[] = [];
        try { loadedParams = JSON.parse(req.params || '[]'); } catch (e) { logger.warn('[RepeaterPersist] Failed to parse params:', e); }
        try { loadedHeaders = JSON.parse(req.headers || '[]'); } catch (e) { logger.warn('[RepeaterPersist] Failed to parse headers:', e); }
        const payloadsRes = await emulateApi.listPayloads(targetId, req.id);
        let loadedPayloads: PayloadItem[] = [];
        if (payloadsRes.success && payloadsRes.data) {
          loadedPayloads = payloadsRes.data.map((p: any) => ({
            id: p.id, name: p.name, description: '',
            values: (() => { try { return JSON.parse(p.payload_values); } catch (e) { logger.warn('[RepeaterPersist] Failed to parse payload values:', e); return []; } })(),
            enabled: p.enabled === 1,
          }));
        }
        onLoadRequest?.({ method: req.method, url: req.url, body: req.body || '', params: loadedParams, headers: loadedHeaders, payloads: loadedPayloads });
        hasLoadedRef.current = true;
      } else { setCurrentRequestId(null); }
      setIsLoading(false);
    })();
    return () => { cancelled = true; };
  }, [targetId]);

  useEffect(() => {
    if (!targetId || isLoading) return;
    const snapshot = JSON.stringify({ method, url, body, params, headers });
    if (snapshot === lastSavedRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        if (currentRequestId) {
          await emulateApi.updateRequest(targetId, currentRequestId, { method, url, body, params: JSON.stringify(params), headers: JSON.stringify(headers) });
        } else {
          const res = await emulateApi.createRequest(targetId, { method, url, body, params: JSON.stringify(params), headers: JSON.stringify(headers) });
          if (res.success && res.data) setCurrentRequestId(res.data.id);
        }
        lastSavedRef.current = snapshot;
      } catch (err) { logger.error('[RepeaterPersist] Save failed:', err); }
      finally { setIsSaving(false); }
    }, 1000);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [targetId, currentRequestId, method, url, body, params, headers, isLoading]);

  const savePayloads = useCallback(async () => {
    if (!targetId || !currentRequestId) return;
    for (const p of payloads) {
      await emulateApi.upsertPayload(targetId, currentRequestId, { name: p.name, payload_values: JSON.stringify(p.values), enabled: p.enabled ? 1 : 0 });
    }
  }, [targetId, currentRequestId, payloads]);

  const saveHistory = useCallback(async (entry: HistoryEntry, runs: RunResult[]) => {
    if (!targetId) return;
    let requestId = currentRequestId;
    if (!requestId) {
      const res = await emulateApi.createRequest(targetId, { method, url, body, params: JSON.stringify(params), headers: JSON.stringify(headers) });
      if (res.success && res.data) { requestId = res.data.id; setCurrentRequestId(requestId); }
      else return;
    }
    await emulateApi.saveHistory(targetId, requestId, {
      history: { method: entry.method, url: entry.url, status: entry.status, statuses: entry.statuses ? JSON.stringify(entry.statuses) : undefined, timestamp: Math.floor(entry.timestamp / 1000), end_time: entry.endTime ? Math.floor(entry.endTime / 1000) : undefined, duration: entry.duration, payload_count: entry.payloadCount || runs.length, payload_summary: entry.payload, request_headers: entry.requestHeaders ? JSON.stringify(entry.requestHeaders) : undefined, request_body: entry.requestBody },
      runs: runs.map((r) => ({ payload_name: r.payloadName, payload_value: r.value, status: r.status, duration: r.duration, method: r.method, url: r.url, params: JSON.stringify(r.params || {}), request_headers: JSON.stringify(r.requestHeaders || {}), request_body: r.requestBody || '', response_headers: JSON.stringify(r.responseHeaders || {}), response_body: r.responseBody || '' })),
    });
  }, [targetId, currentRequestId, method, url, body, params, headers]);

  return { currentRequestId, isLoading, isSaving, savePayloads, saveHistory };
}