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
    
    const loadData = async () => {
      console.log('[RepeaterPersist] 🔄 loadData() called');
      console.log('[RepeaterPersist] targetId:', targetId);
      
      setIsLoading(true);
      const res = await emulateApi.listRequests(targetId);
      
      console.log('[RepeaterPersist] listRequests response:', res);
      
      if (cancelled) return;
      if (res.success && res.data && res.data.length > 0) {
        const req = res.data[0];
        console.log('[RepeaterPersist] Found request:', req.id);
        console.log('[RepeaterPersist] req.params (raw string):', req.params);
        console.log('[RepeaterPersist] req.headers (raw string):', req.headers);
        
        setCurrentRequestId(req.id);
        let loadedParams: ParamItem[] = [];
        let loadedHeaders: ParamItem[] = [];
        try {
          const parsedParams = JSON.parse(req.params || '[]');
          console.log('[RepeaterPersist] parsedParams:', parsedParams);
          
          if (Array.isArray(parsedParams)) {
            // Standard array format: [{"key":"test","value":"1","enabled":true}]
            // Ensure each item has an id
            loadedParams = parsedParams.map(item => ({
              id: item.id || crypto.randomUUID(),
              key: item.key || '',
              value: item.value || '',
              enabled: item.enabled !== undefined ? item.enabled : true,
            }));
          } else if (parsedParams && typeof parsedParams === 'object') {
            // Object format: {"test":"1"} - convert to array
            loadedParams = Object.entries(parsedParams).map(([key, value]) => ({
              id: crypto.randomUUID(),
              key,
              value: String(value),
              enabled: true,
            }));
          }
          console.log('[RepeaterPersist] loadedParams:', loadedParams);
        } catch (e) { logger.warn('[RepeaterPersist] Failed to parse params:', e); }
        try {
          const parsedHeaders = JSON.parse(req.headers || '[]');
          if (Array.isArray(parsedHeaders)) {
            // Ensure each item has an id
            loadedHeaders = parsedHeaders.map(item => ({
              id: item.id || crypto.randomUUID(),
              key: item.key || '',
              value: item.value || '',
              enabled: item.enabled !== undefined ? item.enabled : true,
            }));
          } else if (parsedHeaders && typeof parsedHeaders === 'object') {
            loadedHeaders = Object.entries(parsedHeaders).map(([key, value]) => ({
              id: crypto.randomUUID(),
              key,
              value: String(value),
              enabled: true,
            }));
          }
        } catch (e) { logger.warn('[RepeaterPersist] Failed to parse headers:', e); }
        const payloadsRes = await emulateApi.listPayloads(targetId, req.id);
        let loadedPayloads: PayloadItem[] = [];
        if (payloadsRes.success && payloadsRes.data) {
          loadedPayloads = payloadsRes.data.map((p: any) => ({
            id: p.id, name: p.name, description: '',
            values: (() => { try { return JSON.parse(p.payload_values); } catch (e) { logger.warn('[RepeaterPersist] Failed to parse payload values:', e); return []; } })(),
            enabled: p.enabled === 1,
          }));
        }
        
        console.log('[RepeaterPersist] 🚀 Calling onLoadRequest with:');
        console.log('[RepeaterPersist] - params:', loadedParams);
        console.log('[RepeaterPersist] - headers:', loadedHeaders);
        
        onLoadRequest?.({ method: req.method, url: req.url, body: req.body || '', params: loadedParams, headers: loadedHeaders, payloads: loadedPayloads });
        hasLoadedRef.current = true;
      } else { 
        console.log('[RepeaterPersist] No requests found, setting currentRequestId to null');
        setCurrentRequestId(null); 
      }
      setIsLoading(false);
    };
    
    loadData();
    hasLoadedRef.current = false;
    
    // Listen for repeater updates
    const handleRepeaterUpdate = () => {
      logger.info('[RepeaterPersist] Repeater updated event received, reloading...');
      loadData();
    };
    
    window.addEventListener('repeater-updated', handleRepeaterUpdate);
    
    return () => { 
      cancelled = true;
      window.removeEventListener('repeater-updated', handleRepeaterUpdate);
    };
  }, [targetId]);

  useEffect(() => {
    if (!targetId || isLoading) return;
    const snapshot = JSON.stringify({ method, url, body, params, headers });
    
    logger.info(`[RepeaterPersist] ⚙️ Data changed effect triggered`);
    logger.info(`[RepeaterPersist] targetId: ${targetId}`);
    logger.info(`[RepeaterPersist] isLoading: ${isLoading}`);
    logger.info(`[RepeaterPersist] params:`, params);
    logger.info(`[RepeaterPersist] snapshot: ${snapshot.substring(0, 200)}...`);
    logger.info(`[RepeaterPersist] lastSavedRef: ${lastSavedRef.current.substring(0, 200)}...`);
    
    if (snapshot === lastSavedRef.current) {
      logger.info('[RepeaterPersist] Snapshot unchanged, skipping save');
      return;
    }
    
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      setIsSaving(true);
      logger.info(`[RepeaterPersist] 💾 Saving... currentRequestId: ${currentRequestId}`);
      
      // Remove 'id' field from params and headers before saving
      // Then auto-format with 2-space indent for readability
      const paramsWithoutId = params.map(({ id, ...rest }) => rest);
      const headersWithoutId = headers.map(({ id, ...rest }) => rest);
      
      logger.info(`[RepeaterPersist] paramsWithoutId to save:`, paramsWithoutId);
      logger.info(`[RepeaterPersist] paramsWithoutId JSON:`, JSON.stringify(paramsWithoutId, null, 2));
      
      try {
        if (currentRequestId) {
          logger.info(`[RepeaterPersist] Updating existing request ${currentRequestId}`);
          await emulateApi.updateRequest(targetId, currentRequestId, { 
            method, 
            url, 
            body, 
            params: JSON.stringify(paramsWithoutId, null, 2), 
            headers: JSON.stringify(headersWithoutId, null, 2) 
          });
          logger.info(`[RepeaterPersist] ✅ Update successful`);
        } else {
          logger.info(`[RepeaterPersist] Creating new request`);
          const res = await emulateApi.createRequest(targetId, { 
            method, 
            url, 
            body, 
            params: JSON.stringify(paramsWithoutId, null, 2), 
            headers: JSON.stringify(headersWithoutId, null, 2) 
          });
          if (res.success && res.data) {
            setCurrentRequestId(res.data.id);
            logger.info(`[RepeaterPersist] Created request with ID: ${res.data.id}`);
          }
        }
        lastSavedRef.current = snapshot;
        logger.info(`[RepeaterPersist] lastSavedRef updated`);
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