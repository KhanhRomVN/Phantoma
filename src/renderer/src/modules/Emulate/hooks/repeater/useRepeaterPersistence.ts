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
  const lastSavedRef = useRef<string>('');
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (!targetId) {
      setCurrentRequestId(null);
      hasLoadedRef.current = false;
      return;
    }
    let cancelled = false;

    const loadData = async () => {
      setIsLoading(true);
      const res = await emulateApi.listRequests(targetId);
      if (cancelled) return;
      if (res.success && res.data && res.data.length > 0) {
        const req = res.data[0];
        setCurrentRequestId(req.id);
        let loadedParams: ParamItem[] = [];
        let loadedHeaders: ParamItem[] = [];
        try {
          const parsedParams = JSON.parse(req.params || '[]');
          if (Array.isArray(parsedParams)) {
            // Standard array format: [{"key":"test","value":"1","enabled":true}]
            // Ensure each item has an id
            loadedParams = parsedParams.map((item) => ({
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
        } catch (e) {
          logger.warn('[RepeaterPersist] Failed to parse params:', e);
        }
        try {
          const parsedHeaders = JSON.parse(req.headers || '[]');
          if (Array.isArray(parsedHeaders)) {
            // Ensure each item has an id
            loadedHeaders = parsedHeaders.map((item) => ({
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
        } catch (e) {
          logger.warn('[RepeaterPersist] Failed to parse headers:', e);
        }
        const payloadsRes = await emulateApi.listPayloads(targetId, req.id);
        let loadedPayloads: PayloadItem[] = [];
        if (payloadsRes.success && payloadsRes.data) {
          loadedPayloads = payloadsRes.data.map((p: any) => ({
            id: p.id,
            name: p.name,
            description: '',
            values: (() => {
              try {
                return JSON.parse(p.payload_values);
              } catch (e) {
                logger.warn('[RepeaterPersist] Failed to parse payload values:', e);
                return [];
              }
            })(),
            enabled: p.enabled === 1,
          }));
        }

        onLoadRequest?.({
          method: req.method,
          url: req.url,
          body: req.body || '',
          params: loadedParams,
          headers: loadedHeaders,
          payloads: loadedPayloads,
        });
        hasLoadedRef.current = true;

        // Clear old localStorage data after successful database load
        try {
          const oldPayloadsKey = targetId
            ? `repeater-${targetId}repeater-payloads`
            : 'repeater-payloads';
          const oldHistoryKey = targetId
            ? `repeater-${targetId}repeater-history`
            : 'repeater-history';
          if (localStorage.getItem(oldPayloadsKey)) {
            logger.info('[RepeaterPersist] 🧹 Clearing old localStorage payloads');
            localStorage.removeItem(oldPayloadsKey);
          }
          if (localStorage.getItem(oldHistoryKey)) {
            logger.info('[RepeaterPersist] 🧹 Clearing old localStorage history');
            localStorage.removeItem(oldHistoryKey);
          }
        } catch (e) {
          logger.warn('[RepeaterPersist] Failed to clear old localStorage:', e);
        }
      } else {
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
      logger.info(
        `[RepeaterPersist] paramsWithoutId JSON:`,
        JSON.stringify(paramsWithoutId, null, 2),
      );

      try {
        if (currentRequestId) {
          logger.info(`[RepeaterPersist] Updating existing request ${currentRequestId}`);
          await emulateApi.updateRequest(targetId, currentRequestId, {
            method,
            url,
            body,
            params: JSON.stringify(paramsWithoutId, null, 2),
            headers: JSON.stringify(headersWithoutId, null, 2),
          });
          logger.info(`[RepeaterPersist] ✅ Update successful`);
        } else {
          logger.info(`[RepeaterPersist] Creating new request`);
          const res = await emulateApi.createRequest(targetId, {
            method,
            url,
            body,
            params: JSON.stringify(paramsWithoutId, null, 2),
            headers: JSON.stringify(headersWithoutId, null, 2),
          });
          if (res.success && res.data) {
            setCurrentRequestId(res.data.id);
            logger.info(`[RepeaterPersist] Created request with ID: ${res.data.id}`);
          }
        }
        lastSavedRef.current = snapshot;
        logger.info(`[RepeaterPersist] lastSavedRef updated`);
      } catch (err) {
        logger.error('[RepeaterPersist] Save failed:', err);
      } finally {
        setIsSaving(false);
      }
    }, 1000);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [targetId, currentRequestId, method, url, body, params, headers, isLoading]);

  const savePayloads = useCallback(async () => {
    if (!targetId) return;
    let requestId = currentRequestId;
    if (!requestId) {
      const paramsWithoutId = params.map(({ id, ...rest }) => rest);
      const headersWithoutId = headers.map(({ id, ...rest }) => rest);
      const res = await emulateApi.createRequest(targetId, {
        method,
        url,
        body,
        params: JSON.stringify(paramsWithoutId, null, 2),
        headers: JSON.stringify(headersWithoutId, null, 2),
      });
      if (res.success && res.data) {
        requestId = res.data.id;
        setCurrentRequestId(requestId);
      } else {
        return;
      }
    }
    for (const p of payloads) {
      await emulateApi.upsertPayload(targetId, requestId, {
        name: p.name,
        payload_values: JSON.stringify(p.values),
        enabled: p.enabled ? 1 : 0,
      });
    }
  }, [targetId, currentRequestId, method, url, body, params, headers, payloads]);

  const saveHistory = useCallback(
    async (entry: HistoryEntry, runs: RunResult[]) => {
      if (!targetId) return;
      let requestId = currentRequestId;
      if (!requestId) {
        const res = await emulateApi.createRequest(targetId, {
          method,
          url,
          body,
          params: JSON.stringify(params),
          headers: JSON.stringify(headers),
        });
        if (res.success && res.data) {
          requestId = res.data.id;
          setCurrentRequestId(requestId);
        } else return;
      }

      // Save new history
      await emulateApi.saveHistory(targetId, requestId, {
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

      // Auto-cleanup: keep max 30 history items per repeater
      const historyList = await emulateApi.listHistoryByRequest(targetId, requestId);
      if (historyList.success && historyList.data && historyList.data.length > 30) {
        // Sort by timestamp descending, then delete oldest items
        const sorted = [...historyList.data].sort((a, b) => b.timestamp - a.timestamp);
        const toDelete = sorted.slice(30);
        for (const oldHistory of toDelete) {
          await emulateApi.deleteHistory(targetId, oldHistory.id);
        }
      }
    },
    [targetId, currentRequestId, method, url, body, params, headers],
  );

  const loadHistory = useCallback(async (): Promise<HistoryEntry[]> => {
    if (!targetId || !currentRequestId) return [];

    const res = await emulateApi.listHistoryByRequest(targetId, currentRequestId);
    if (!res.success || !res.data) return [];

    // Map DTO to HistoryEntry - load response data from first run
    const entries: HistoryEntry[] = await Promise.all(
      res.data.map(async (h: any) => {
        // Load runs to get response data
        const runsRes = await emulateApi.getHistoryRuns(targetId, h.id);
        const firstRun =
          runsRes.success && runsRes.data && runsRes.data.length > 0 ? runsRes.data[0] : null;

        return {
          id: h.id,
          method: h.method,
          url: h.url,
          status: h.status || 0,
          statuses: h.statuses ? JSON.parse(h.statuses) : undefined,
          timestamp: h.timestamp * 1000, // Convert from seconds to milliseconds
          endTime: h.end_time ? h.end_time * 1000 : undefined,
          duration: h.duration || 0,
          payload: h.payload_summary || '',
          payloadCount: h.payload_count,
          requestHeaders: h.request_headers ? JSON.parse(h.request_headers) : {},
          requestBody: h.request_body || '',
          responseHeaders: firstRun?.response_headers ? JSON.parse(firstRun.response_headers) : {},
          responseBody: firstRun?.response_body || '',
        };
      }),
    );

    return entries;
  }, [targetId, currentRequestId]);

  return { currentRequestId, isLoading, isSaving, savePayloads, saveHistory, loadHistory };
}
