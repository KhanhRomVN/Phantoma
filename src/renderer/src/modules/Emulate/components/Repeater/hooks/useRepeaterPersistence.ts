import { useState, useEffect, useRef, useCallback } from 'react';
import { repeaterApi } from '../../../services/repeater-api.service';
import type { ParamItem, PayloadItem, HistoryEntry, RunResult } from '../WorkspacePanel/RequestPanel/types';

interface UseRepeaterPersistenceOptions {
  targetId: string | null;
  // Current state values (for save)
  method: string;
  url: string;
  body: string;
  params: ParamItem[];
  headers: ParamItem[];
  payloads: PayloadItem[];
  // Callbacks
  onLoadRequest?: (req: {
    method: string;
    url: string;
    body: string;
    params: ParamItem[];
    headers: ParamItem[];
    payloads: PayloadItem[];
  }) => void;
}

export function useRepeaterPersistence({
  targetId,
  method,
  url,
  body,
  params,
  headers,
  payloads,
  onLoadRequest,
}: UseRepeaterPersistenceOptions) {
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>(''); // JSON snapshot để tránh save trùng
  const hasLoadedRef = useRef(false);       // Chỉ load 1 lần khi targetId thay đổi

  // ── Load request khi targetId thay đổi ────────────────────────────────────
  useEffect(() => {
    if (!targetId) {
      console.log('[RepeaterPersist] No targetId, skip load');
      setCurrentRequestId(null);
      hasLoadedRef.current = false;
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    hasLoadedRef.current = false;
    console.log('[RepeaterPersist] Loading requests for target:', targetId);

    (async () => {
      const res = await repeaterApi.listRequests(targetId);
      if (cancelled) return;

      console.log('[RepeaterPersist] listRequests response:', res.success, res.data?.length, 'items');

      if (res.success && res.data && res.data.length > 0) {
        const req = res.data[0];
        console.log('[RepeaterPersist] Loaded request:', req.id, req.method, req.url);
        setCurrentRequestId(req.id);

        // Parse JSON columns
        let loadedParams: ParamItem[] = [];
        let loadedHeaders: ParamItem[] = [];
        try { loadedParams = JSON.parse(req.params || '[]'); } catch (e) { console.warn('[RepeaterPersist] Failed to parse params:', e); }
        try { loadedHeaders = JSON.parse(req.headers || '[]'); } catch (e) { console.warn('[RepeaterPersist] Failed to parse headers:', e); }

        // Load payloads
        const payloadsRes = await repeaterApi.listPayloads(targetId, req.id);
        let loadedPayloads: PayloadItem[] = [];
        if (payloadsRes.success && payloadsRes.data) {
          loadedPayloads = payloadsRes.data.map((p) => ({
            id: p.id,
            name: p.name,
            description: '',
            values: (() => { try { return JSON.parse(p.payload_values); } catch { return []; } })(),
            enabled: p.enabled === 1,
          }));
          console.log('[RepeaterPersist] Loaded payloads:', loadedPayloads.length);
        }

        // Fill form via callback
        console.log('[RepeaterPersist] Filling form with loaded data');
        onLoadRequest?.({
          method: req.method,
          url: req.url,
          body: req.body || '',
          params: loadedParams,
          headers: loadedHeaders,
          payloads: loadedPayloads,
        });
        hasLoadedRef.current = true;
      } else {
        console.log('[RepeaterPersist] No existing requests for this target');
        setCurrentRequestId(null);
      }
      setIsLoading(false);
    })();

    return () => { cancelled = true; };
  }, [targetId]);

  // ── Auto-save request khi state thay đổi (debounce 1s) ────────────────────
  useEffect(() => {
    if (!targetId || isLoading) return;

    const snapshot = JSON.stringify({ method, url, body, params, headers });
    if (snapshot === lastSavedRef.current) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        if (currentRequestId) {
          console.log('[RepeaterPersist] Updating request:', currentRequestId);
          const res = await repeaterApi.updateRequest(targetId, currentRequestId, {
            method,
            url,
            body,
            params: JSON.stringify(params),
            headers: JSON.stringify(headers),
          });
          console.log('[RepeaterPersist] Update result:', res.success, res.error || '');
        } else {
          console.log('[RepeaterPersist] Creating new request for target:', targetId);
          const res = await repeaterApi.createRequest(targetId, {
            method,
            url,
            body,
            params: JSON.stringify(params),
            headers: JSON.stringify(headers),
          });
          console.log('[RepeaterPersist] Create result:', res.success, res.error || '');
          if (res.success && res.data) {
            setCurrentRequestId(res.data.id);
            console.log('[RepeaterPersist] New request ID:', res.data.id);
          }
        }
        lastSavedRef.current = snapshot;
      } catch (err) {
        console.error('[RepeaterPersist] Save failed:', err);
      } finally {
        setIsSaving(false);
      }
    }, 1000);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [targetId, currentRequestId, method, url, body, params, headers, isLoading]);

  // ── Save payloads ─────────────────────────────────────────────────────────
  const savePayloads = useCallback(async () => {
    if (!targetId || !currentRequestId) {
      console.log('[RepeaterPersist] savePayloads skipped — no targetId or requestId');
      return;
    }
    console.log('[RepeaterPersist] Saving payloads, count:', payloads.length);
    try {
      for (const p of payloads) {
        const res = await repeaterApi.upsertPayload(targetId, currentRequestId, {
          name: p.name,
          payload_values: JSON.stringify(p.values),
          enabled: p.enabled ? 1 : 0,
        });
        if (!res.success) {
          console.error('[RepeaterPersist] Upsert payload failed:', p.name, res.error);
        }
      }
      console.log('[RepeaterPersist] Payloads saved');
    } catch (err) {
      console.error('[RepeaterPersist] Save payloads failed:', err);
    }
  }, [targetId, currentRequestId, payloads]);

  // ── Save history ──────────────────────────────────────────────────────────
  const saveHistory = useCallback(async (
    entry: HistoryEntry,
    runs: RunResult[],
  ) => {
    if (!targetId) {
      console.error('[RepeaterPersist] saveHistory failed — no targetId');
      return;
    }
    let requestId = currentRequestId;
    if (!requestId) {
      console.log('[RepeaterPersist] No requestId, creating request first...');
      const res = await repeaterApi.createRequest(targetId, {
        method,
        url,
        body,
        params: JSON.stringify(params),
        headers: JSON.stringify(headers),
      });
      if (res.success && res.data) {
        requestId = res.data.id;
        setCurrentRequestId(requestId);
        console.log('[RepeaterPersist] Created request for history:', requestId);
      } else {
        console.error('[RepeaterPersist] Cannot create request for history:', res.error);
        return;
      }
    }

    console.log('[RepeaterPersist] Saving history, runs:', runs.length);
    const res = await repeaterApi.saveHistory(targetId, requestId, {
      history: {
        method: entry.method,
        url: entry.url,
        status: entry.status,
        statuses: entry.statuses ? JSON.stringify(entry.statuses) : undefined,
        timestamp: Math.floor(entry.timestamp / 1000),
        end_time: entry.endTime ? Math.floor(entry.endTime / 1000) : undefined,
        duration: entry.duration,
        payload_count: entry.payloadCount || runs.length,
        payload_summary: entry.payload,
        request_headers: entry.requestHeaders ? JSON.stringify(entry.requestHeaders) : undefined,
        request_body: entry.requestBody,
      },
      runs: runs.map((r) => ({
        payload_name: r.payloadName,
        payload_value: r.value,
        status: r.status,
        duration: r.duration,
        method: r.method,
        url: r.url,
        params: JSON.stringify(r.params || {}),
        request_headers: JSON.stringify(r.requestHeaders || {}),
        request_body: r.requestBody || '',
        response_headers: JSON.stringify(r.responseHeaders || {}),
        response_body: r.responseBody || '',
      })),
    });
    console.log('[RepeaterPersist] Save history result:', res.success, res.error || '');
  }, [targetId, currentRequestId, method, url, body, params, headers]);

  return {
    currentRequestId,
    isLoading,
    isSaving,
    savePayloads,
    saveHistory,
  };
}