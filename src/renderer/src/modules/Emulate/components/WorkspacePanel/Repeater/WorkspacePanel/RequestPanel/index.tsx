import { useState, useEffect, useRef } from 'react';
import { Code, TextAlignJustify, Trash2 } from 'lucide-react';

// ── Components ──
import { ParamTab } from './TabContent/ParamTab';
import { HeaderTab } from './TabContent/HeaderTab';
import { BodyTab } from './TabContent/BodyTab';
import { PayloadTab } from './TabContent/PayloadTab';
import { HistoryTab } from './TabContent/HistoryTab';
import { PayloadPreviewModal, type PayloadMode } from './modal/PayloadPreviewModal';
import { ProgressModal } from './modal/ProgressModal';
import { ResultsModal } from './modal/ResultsModal';
import { RequestBar } from './RequestBar';
import { CodeBlockRef } from '@renderer/components/common/CodeBlock';

// ── Types ──
import { NetworkRequest } from '../../../Home/FilterPanel';
import type {
  ParamItem,
  PayloadItem,
  HistoryEntry,
  RepeaterTab,
  RunResult,
} from '../../../../../types/repeater.types';

// ── Hooks ──
import { useRepeaterPersistence } from '../../../../../hooks/useRepeaterPersistence';

// ── Services ──
import { emulateApi } from '../../../../../services/emulate-api.service';

// ── Utils ──
import { cn } from '@renderer/shared/utils/cn';

// Services
import { ipcService } from '../../../../../../../services/ipc.service';

interface SendRequestResult {
  status: number;
  headers: Record<string, string>;
  body: string;
}

interface RequestPanelProps {
  request: NetworkRequest | null;
  lastRunTimestamp?: number | null;
  saveToHistory?: boolean;
  onSaveToggle?: () => void;
  onRun?: () => void;
  onSaveSession?: () => void;
  onSwitchTab?: (tab: RepeaterTab) => void;
  payloads?: PayloadItem[];
  targetId?: string | null;
}

export function RequestPanel({
  request,
  lastRunTimestamp: externalLastRunTimestamp,
  saveToHistory: externalSaveToHistory,
  onRun,
  payloads: externalPayloads,
  targetId,
}: RequestPanelProps) {
  // Request config
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('');
  const [params, setParams] = useState<ParamItem[]>([]);
  const [headers, setHeaders] = useState<ParamItem[]>([]);
  const [body, setBody] = useState('');
  // Ưu tiên dữ liệu network store khi request có headers/params/body
  const [hasNetworkData, setHasNetworkData] = useState(false);

  // Payload management - use external if provided, otherwise internal
  const [internalPayloads, setInternalPayloads] = useState<PayloadItem[]>(() => {
    if (externalPayloads !== undefined) return externalPayloads;
    return [];
  });
  const payloads = externalPayloads !== undefined ? externalPayloads : internalPayloads;
  const setPayloads = (newPayloads: PayloadItem[] | ((prev: PayloadItem[]) => PayloadItem[])) => {
    let result: PayloadItem[];
    if (typeof newPayloads === 'function') {
      const current = externalPayloads !== undefined ? externalPayloads : internalPayloads;
      result = newPayloads(current);
    } else {
      result = newPayloads;
    }

    setInternalPayloads(result);
  };

  // History
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // Execution state
  const [isExecuting, setIsExecuting] = useState(false);
  const [activeTab, setActiveTab] = useState<RepeaterTab>('params');

  // View mode state (table vs raw)
  const [isParamsRawView, setIsParamsRawView] = useState(false);
  const [isHeadersRawView, setIsHeadersRawView] = useState(false);

  const bodyCodeBlockRef = useRef<CodeBlockRef>(null);
  const paramsCodeBlockRef = useRef<CodeBlockRef>(null);
  const headersCodeBlockRef = useRef<CodeBlockRef>(null);

  const [, setInternalLastRunTimestamp] = useState<number | null>(null);
  const [internalSaveToHistory] = useState(true);

  const saveToHistory =
    externalSaveToHistory !== undefined ? externalSaveToHistory : internalSaveToHistory;

  // Run modal state
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isProgressOpen, setIsProgressOpen] = useState(false);
  const [runTotalRequests, setRunTotalRequests] = useState(0);
  const [runEnabledPayloads, setRunEnabledPayloads] = useState<PayloadItem[]>([]);
  const [runResults, setRunResults] = useState<RunResult[]>([]);
  const [runProgress, setRunProgress] = useState(0);
  const [runLabel, setRunLabel] = useState('');
  const [payloadResultData, setPayloadResultData] = useState<RunResult[] | null>(null);
  const cancelledRef = useRef(false);

  // State for viewing history runs in modal
  const [historyRunsModal, setHistoryRunsModal] = useState<{ isOpen: boolean; runs: RunResult[] }>({
    isOpen: false,
    runs: [],
  });

  // ── Repeater persistence: auto load/save to backend SQLite ────────────────
  const persistence = useRepeaterPersistence({
    targetId: targetId || null,
    method,
    url,
    body,
    params,
    headers,
    payloads,
    onLoadRequest: (req) => {
      if (hasNetworkData) {
        return;
      }

      setMethod(req.method);
      setUrl(req.url);
      setBody(req.body);
      setParams(req.params);
      setHeaders(req.headers);
      setInternalPayloads(req.payloads);
    },
  });

  useEffect(() => {
    if (persistence.isLoading) {
      return;
    }

    const allValues = [...params.map((p) => p.value), ...headers.map((h) => h.value), body].join(
      ' ',
    );

    const RE_VAR = /\$\{([^}]+)\}/g;
    const detectedNames = new Set<string>();
    let match: RegExpExecArray | null;
    while ((match = RE_VAR.exec(allValues)) !== null) {
      detectedNames.add(match[1]);
    }

    // Use functional update to ensure we have the latest payloads
    setPayloads((currentPayloads) => {
      const newPayloads: PayloadItem[] = [];
      const needsCleanup = currentPayloads.some(
        (p) => p.description?.startsWith('Auto-created from') && !detectedNames.has(p.name),
      );

      if (newPayloads.length > 0 || needsCleanup) {
        const kept = currentPayloads.filter((p) => {
          if (!p.description?.startsWith('Auto-created from')) return true;
          return detectedNames.has(p.name);
        });
        return [...kept, ...newPayloads];
      }

      return currentPayloads; // No changes needed
    });
  }, [params, headers, body, persistence.isLoading]); // Add isLoading to deps

  useEffect(() => {
    if (!targetId) return;
    const timer = setTimeout(() => {
      persistence.savePayloads();
    }, 1000);
    return () => clearTimeout(timer);
  }, [payloads, targetId, persistence]);

  useEffect(() => {
    if (!targetId || !persistence.currentRequestId) return;

    const loadHistoryData = async () => {
      const entries = await persistence.loadHistory();
      setHistory(entries);
    };

    loadHistoryData();
  }, [targetId, persistence.currentRequestId, persistence]);

  // Auto-save params khi có thay đổi (debounce 500ms)
  useEffect(() => {
    if (!targetId) return;
    const timer = setTimeout(() => {}, 500);
    return () => clearTimeout(timer);
  }, [params, targetId]);

  // Auto-save headers khi có thay đổi (debounce 500ms)
  useEffect(() => {
    if (!targetId) return;
    const timer = setTimeout(() => {}, 500);
    return () => clearTimeout(timer);
  }, [headers, targetId]);

  // Auto-save body khi có thay đổi (debounce 500ms)
  useEffect(() => {
    if (!targetId) return;
    const timer = setTimeout(() => {}, 500);
    return () => clearTimeout(timer);
  }, [body, targetId]);

  // Auto-fill from selected request (Send to Repeater)
  useEffect(() => {
    if (!request) {
      setHasNetworkData(false);
      return;
    }

    setInternalPayloads([]);

    const requestUrl = request.url || '';
    setUrl(requestUrl);
    setMethod(request.method || 'GET');

    try {
      const urlObj = new URL(requestUrl);
      const paramItems: ParamItem[] = [];
      urlObj.searchParams.forEach((value, key) => {
        paramItems.push({
          id: crypto.randomUUID(),
          key,
          value,
          enabled: true,
        });
      });
      setParams(paramItems);
      setUrl(requestUrl.split('?')[0]);
    } catch (error) {
      setParams([]);
    }

    if (request.requestHeaders) {
      const headerItems: ParamItem[] = Object.entries(request.requestHeaders).map(
        ([key, value]) => ({
          id: crypto.randomUUID(),
          key,
          value: String(value),
          enabled: true,
        }),
      );

      setHeaders(headerItems);
    } else {
      // [DEBUG] Có thể xóa sau khi fix xong bug header trống ở Repeater
      console.warn('[DEBUG][RequestPanel] request.requestHeaders is empty/undefined');
    }

    const finalBody =
      typeof request.requestBody === 'string'
        ? request.requestBody
        : request.requestBody
          ? JSON.stringify(request.requestBody)
          : '';

    setBody(finalBody);

    const hasData =
      (request.requestHeaders && Object.keys(request.requestHeaders).length > 0) ||
      (request.requestBody !== undefined && request.requestBody !== '') ||
      request.url.includes('?');
    setHasNetworkData(hasData);
  }, [request]);

  const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

  const buildRequest = () => {
    const headersObj: Record<string, string> = {};
    headers
      .filter((h) => h.enabled && h.key)
      .forEach((h) => {
        headersObj[h.key] = h.value;
      });

    const paramsObj: Record<string, string> = {};
    params
      .filter((p) => p.enabled && p.key)
      .forEach((p) => {
        paramsObj[p.key] = p.value;
      });

    let finalUrl = url;
    if (Object.keys(paramsObj).length > 0) {
      const queryString = Object.entries(paramsObj)
        .map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v))
        .join('&');
      finalUrl += (finalUrl.includes('?') ? '&' : '?') + queryString;
    }

    return { url: finalUrl, headers: headersObj, body: body };
  };

  const executeRequest = async (payload?: string, skipHistory?: boolean) => {
    const { headers: headersObj } = buildRequest();
    let finalBody = body;
    const finalHeaders = { ...headersObj };
    const finalParams: Record<string, string> = {
      ...params
        .filter((p) => p.enabled && p.key)
        .reduce((acc, p) => ({ ...acc, [p.key]: p.value }), {}),
    };

    if (payload) {
      const activePayload = payloads.find((p) => p.enabled && p.values.includes(payload));
      if (activePayload) {
        const escapedName = activePayload.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp('\\$\\{' + escapedName + '\\}', 'g');

        finalBody = finalBody.replace(regex, payload);

        Object.keys(finalHeaders).forEach((key) => {
          finalHeaders[key] = finalHeaders[key].replace(regex, payload);
        });

        Object.keys(finalParams).forEach((key) => {
          finalParams[key] = finalParams[key].replace(regex, payload);
        });
      }
    }

    let executionUrl = url;
    if (Object.keys(finalParams).length > 0) {
      const queryString = Object.entries(finalParams)
        .map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v as string))
        .join('&');
      executionUrl += (executionUrl.includes('?') ? '&' : '?') + queryString;
    }

    setIsExecuting(true);
    const startTime = Date.now();

    try {
      const res = await ipcService.sendRequest({
        url: executionUrl,
        method,
        headers: finalHeaders,
        body: method !== 'GET' && finalBody ? finalBody : undefined,
      });
      const result: SendRequestResult = res.success
        ? (res.data as SendRequestResult)
        : { status: 0, headers: {}, body: '' };

      const duration = Date.now() - startTime;

      const entry: HistoryEntry = {
        id: crypto.randomUUID(),
        method,
        url: executionUrl,
        status: result.status || 0,
        timestamp: Date.now(),
        duration,
        payload: payload || '',
        requestHeaders: finalHeaders,
        requestBody: method !== 'GET' ? finalBody : undefined,
        responseHeaders: result.headers,
        responseBody: result.body,
      };

      if (saveToHistory && !skipHistory) {
        setHistory((prev) => [entry, ...prev]);
      }
      setIsExecuting(false);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const entry: HistoryEntry = {
        id: crypto.randomUUID(),
        method,
        url: executionUrl,
        status: 0,
        timestamp: Date.now(),
        duration,
        payload: payload || '',
        requestHeaders: finalHeaders,
        requestBody: method !== 'GET' ? finalBody : undefined,
        responseHeaders: {},
        responseBody: '',
      };
      if (saveToHistory) {
        setHistory((prev) => [entry, ...prev]);
      }
      setIsExecuting(false);
      throw error;
    }
  };

  const handleSend = () => {
    if (!url) return;
    const enabledPayloads = payloads.filter((p) => p.enabled && p.values.length > 0);
    if (enabledPayloads.length === 0) {
      executeRequest(undefined, true);
      return;
    }

    // Calculate total based on cartesian product for initial display
    const total = enabledPayloads.reduce((acc, p) => acc * p.values.length, 1);
    setRunTotalRequests(total);
    setRunEnabledPayloads(enabledPayloads);
    setIsPreviewOpen(true);
  };

  const handleStartRun = async (mode: PayloadMode) => {
    setIsPreviewOpen(false);
    setIsProgressOpen(true);
    setRunResults([]);
    setRunProgress(0);
    setRunLabel('');
    cancelledRef.current = false;

    const onProgress = (item: RunResult) => {
      setRunResults((prev) => [...prev, item]);
      setRunProgress((prev) => prev + 1);
      setRunLabel(`${item.payloadName}=${item.value}`);
    };

    const finalResults = await handleRunStart(onProgress, cancelledRef, mode);

    if (!cancelledRef.current) {
      setIsProgressOpen(false);
      setPayloadResultData(finalResults);
    } else {
      setIsProgressOpen(false);
    }
  };

  const handleCancelRun = () => {
    cancelledRef.current = true;
  };

  // Called by PayloadPreviewModal when user clicks Start
  const handleRunStart = async (
    onProgress: (item: RunResult) => void,
    cancelledRef: React.MutableRefObject<boolean>,
    mode: 'sequential' | 'cartesian' | 'permutation',
  ): Promise<RunResult[]> => {
    const timestamp = Date.now();
    if (externalLastRunTimestamp === undefined) {
      setInternalLastRunTimestamp(timestamp);
    }
    if (onRun) onRun();

    const enabledPayloads = payloads.filter((p) => p.enabled && p.values.length > 0);
    const results: RunResult[] = [];

    if (enabledPayloads.length === 0) {
      const reqStart = Date.now();
      try {
        const result = await executeRequest(undefined, true);
        const s = result.status || 0;
        const d = Date.now() - reqStart;
        const item: RunResult = {
          payloadName: '',
          value: '',
          status: s,
          duration: d,
          method,
          url,
          params: {},
          requestHeaders: {},
          requestBody: '',
          responseHeaders: result.headers || {},
          responseBody: result.body || '',
        };
        results.push(item);
        onProgress(item);
      } catch {
        results.push({
          payloadName: '',
          value: '',
          status: 0,
          duration: Date.now() - reqStart,
          method,
          url,
          params: {},
          requestHeaders: {},
          requestBody: '',
          responseHeaders: {},
          responseBody: '',
        });
      }
      return results;
    }

    // Generate payload combinations based on mode
    const generateCombinations = (): Array<Record<string, string>> => {
      if (mode === 'sequential') {
        const result: Array<Record<string, string>> = [];
        enabledPayloads.forEach((payload) => {
          payload.values.forEach((val) => {
            result.push({ [payload.name]: val });
          });
        });
        return result;
      } else if (mode === 'cartesian') {
        const result: Array<Record<string, string>> = [{}];
        enabledPayloads.forEach((payload) => {
          const newResult: Array<Record<string, string>> = [];
          result.forEach((combination) => {
            payload.values.forEach((val) => {
              newResult.push({ ...combination, [payload.name]: val });
            });
          });
          result.length = 0;
          result.push(...newResult);
        });
        return result;
      } else {
        // Permutation - same as cartesian for now
        const result: Array<Record<string, string>> = [{}];
        enabledPayloads.forEach((payload) => {
          const newResult: Array<Record<string, string>> = [];
          result.forEach((combination) => {
            payload.values.forEach((val) => {
              newResult.push({ ...combination, [payload.name]: val });
            });
          });
          result.length = 0;
          result.push(...newResult);
        });
        return result;
      }
    };

    const combinations = generateCombinations();

    for (const combination of combinations) {
      if (cancelledRef.current) break;

      // Build substituted values
      let finalBody = body;
      const finalHeaders = {
        ...Object.fromEntries(
          headers.filter((h) => h.enabled && h.key).map((h) => [h.key, h.value]),
        ),
      };
      const finalParams: Record<string, string> = {
        ...params
          .filter((p) => p.enabled && p.key)
          .reduce((acc, p) => ({ ...acc, [p.key]: p.value }), {}),
      };

      // Substitute all variables in combination
      Object.entries(combination).forEach(([varName, value]) => {
        const regex = new RegExp(
          '\\$\\{' + varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\}',
          'g',
        );
        finalBody = finalBody.replace(regex, value);
        Object.keys(finalHeaders).forEach((key) => {
          finalHeaders[key] = finalHeaders[key].replace(regex, value);
        });
        Object.keys(finalParams).forEach((key) => {
          finalParams[key] = (finalParams[key] as string).replace(regex, value);
        });
      });

      // Build URL with params
      let executionUrl = url;
      if (Object.keys(finalParams).length > 0) {
        const queryString = Object.entries(finalParams)
          .map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v as string))
          .join('&');
        executionUrl += (executionUrl.includes('?') ? '&' : '?') + queryString;
      }

      const reqStart = Date.now();
      try {
        const result = await ipcService.sendRequest({
          url: executionUrl,
          method,
          headers: finalHeaders,
          body: method !== 'GET' && finalBody ? finalBody : undefined,
        });
        const sendResult = result.success
          ? (result.data as SendRequestResult)
          : { status: 0, headers: {}, body: '' };

        const s = sendResult.status || 0;
        const d = Date.now() - reqStart;
        const combinationStr = Object.entries(combination)
          .map(([k, v]) => `${k}=${v}`)
          .join(', ');
        const item: RunResult = {
          payloadName: Object.keys(combination)[0] || '',
          value: combinationStr,
          status: s,
          duration: d,
          method,
          url: executionUrl,
          params: finalParams,
          requestHeaders: finalHeaders,
          requestBody: method !== 'GET' ? finalBody : '',
          responseHeaders: sendResult.headers || {},
          responseBody: sendResult.body || '',
        };
        results.push(item);
        onProgress(item);
      } catch {
        const combinationStr = Object.entries(combination)
          .map(([k, v]) => `${k}=${v}`)
          .join(', ');
        const item: RunResult = {
          payloadName: Object.keys(combination)[0] || '',
          value: combinationStr,
          status: 0,
          duration: Date.now() - reqStart,
          method,
          url: executionUrl,
          params: finalParams,
          requestHeaders: finalHeaders,
          requestBody: method !== 'GET' ? finalBody : '',
          responseHeaders: {},
          responseBody: '',
        };
        results.push(item);
        onProgress(item);
      }
    }

    return results;
  };

  const handleSavePayloadResults = async () => {
    if (!payloadResultData || payloadResultData.length === 0) return;
    const first = payloadResultData[0];
    const statusCounts: Record<number, number> = {};
    const allValues: string[] = [];
    payloadResultData.forEach((r) => {
      statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
      if (r.value) allValues.push(r.value);
    });
    const entry: HistoryEntry = {
      id: crypto.randomUUID(),
      method,
      url,
      status: first.status || 0,
      statuses: statusCounts,
      timestamp: Date.now(),
      duration: 0,
      payload: allValues.join(', '),
      payloadCount: allValues.length,
      requestHeaders: Object.fromEntries(
        headers.filter((h) => h.enabled && h.key).map((h) => [h.key, h.value]),
      ),
      requestBody: method !== 'GET' ? body : undefined,
      responseHeaders: first.responseHeaders,
      responseBody: first.responseBody,
    };
    // Save to backend via persistence hook, then update local state
    await persistence.saveHistory(entry, payloadResultData);
    setHistory((prev) => [entry, ...prev]);
    setPayloadResultData(null);
  };

  const handleViewRuns = async (entry: HistoryEntry) => {
    if (!targetId) return;

    // Load runs from database
    const runsRes = await emulateApi.getHistoryRuns(targetId, entry.id);

    if (runsRes.success && runsRes.data) {
      // Map database runs to RunResult format
      const runs: RunResult[] = runsRes.data.map((run: any) => ({
        payloadName: run.payload_name || '',
        value: run.payload_value || '',
        status: run.status || 0,
        duration: run.duration || 0,
        method: run.method || entry.method,
        url: run.url || entry.url,
        params: run.params ? JSON.parse(run.params) : {},
        requestHeaders: run.request_headers ? JSON.parse(run.request_headers) : {},
        requestBody: run.request_body || '',
        responseHeaders: run.response_headers ? JSON.parse(run.response_headers) : {},
        responseBody: run.response_body || '',
      }));

      setHistoryRunsModal({ isOpen: true, runs });
    } else {
      console.error('[RequestPanel] Failed to load runs:', runsRes.error);
    }
  };

  const handleDeleteHistory = async (id: string) => {
    if (!targetId) return;

    // Delete from database
    await emulateApi.deleteHistory(targetId, id);

    // Update local state
    setHistory((prev) => prev.filter((h) => h.id !== id));
  };

  const handleClearHistory = async () => {
    if (!targetId || !persistence.currentRequestId) return;

    // Delete all history entries from database
    const historyList = await emulateApi.listHistoryByRequest(
      targetId,
      persistence.currentRequestId,
    );
    if (historyList.success && historyList.data) {
      for (const h of historyList.data) {
        await emulateApi.deleteHistory(targetId, h.id);
      }
    }

    // Update local state
    setHistory([]);
  };

  const handleUploadPayloads = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const lines = content
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line);

      const newPayloads: PayloadItem[] = lines.map((line) => {
        const parts = line.split('\t');
        if (parts.length >= 3) {
          return {
            id: crypto.randomUUID(),
            name: parts[0].trim(),
            description: parts[1].trim(),
            values: parts[2]
              .split(',')
              .map((v) => v.trim())
              .filter((v) => v),
            enabled: true,
          };
        }
        return {
          id: crypto.randomUUID(),
          name: 'Payload ' + (payloads.length + 1),
          description: '',
          values: line
            .split(',')
            .map((v) => v.trim())
            .filter((v) => v),
          enabled: true,
        };
      });

      setPayloads((prev) => [...prev, ...newPayloads]);
    };
    reader.readAsText(file);
  };

  const handleExportPayloads = () => {
    const content = payloads
      .map((p) => [p.name, p.description, p.values.join(', ')].join('\t'))
      .join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'payloads.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeletePayload = async (id: string) => {
    const target = payloads.find((p) => p.id === id);
    if (!target) return;

    const name = target.name;
    if (name) {
      // Xóa pattern ${name} khỏi params, headers, body
      const pattern = `\${${name}}`;
      setParams((prev) => prev.map((p) => ({ ...p, value: p.value.split(pattern).join('') })));
      setHeaders((prev) => prev.map((h) => ({ ...h, value: h.value.split(pattern).join('') })));
      setBody((prev) => prev.split(pattern).join(''));
    }

    // Delete from database
    if (targetId && persistence.currentRequestId) {
      await emulateApi.deletePayload(targetId, persistence.currentRequestId, id);
    }

    // Xóa payload từ state
    setPayloads((prev) => prev.filter((p) => p.id !== id));
  };

  const handleNavigateToVariable = (payloadName: string) => {
    if (!payloadName) return;

    const needle = `\${${payloadName}}`;
    if (params.some((p) => p.value.includes(needle))) {
      setActiveTab('params');
    } else if (headers.some((h) => h.value.includes(needle))) {
      setActiveTab('headers');
    } else if (body.includes(needle)) {
      setActiveTab('body');
    }
  };

  const paramErrors = params
    .filter((p) => p.enabled && p.key && !p.value)
    .map((p) => `Param "${p.key}" has empty value`);

  const headerErrors = headers
    .filter((h) => h.enabled && h.key && !h.value)
    .map((h) => `Header "${h.key}" has empty value`);

  const emptyPayloadErrors = payloads
    .filter((p) => p.enabled && p.values.length === 0)
    .map((p) => `Payload "${p.name}" has no values`);

  const allErrors: string[] = [];
  if (!url) allErrors.push('URL is required');
  allErrors.push(...paramErrors, ...headerErrors, ...emptyPayloadErrors);

  const tabs: { id: RepeaterTab; label: React.ReactNode; count?: number; error?: boolean }[] = [
    {
      id: 'params',
      label: 'Params',
      count: params.filter((p) => p.enabled && p.key).length,
      error: paramErrors.length > 0,
    },
    {
      id: 'headers',
      label: 'Headers',
      count: headers.filter((h) => h.enabled && h.key).length,
      error: headerErrors.length > 0,
    },
    { id: 'body', label: 'Body' },
    {
      id: 'payload',
      label: 'Payload',
      count: payloads.filter((p) => p.enabled).length,
      error: emptyPayloadErrors.length > 0,
    },
    { id: 'history', label: 'History', count: history.length },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <RequestBar
        method={method}
        url={url}
        isExecuting={isExecuting}
        methods={methods}
        onMethodChange={setMethod}
        onUrlChange={setUrl}
        onSend={handleSend}
        hasEmptyPayload={payloads.some((p) => p.enabled && p.values.length === 0)}
        errors={allErrors}
      />

      <div className="flex items-center border-b border-border shrink-0 bg-table-headerBg/50 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-sm font-medium whitespace-nowrap transition-all border-b-2',
              activeTab === tab.id
                ? 'border-primary text-text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-dropdown-item-hover/30',
            )}
          >
            <span>{tab.label}</span>

            {/* Toggle view icon - only show when tab is active and it's params or headers */}
            {activeTab === tab.id && (tab.id === 'params' || tab.id === 'headers') && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  if (tab.id === 'params') {
                    setIsParamsRawView(!isParamsRawView);
                  } else if (tab.id === 'headers') {
                    setIsHeadersRawView(!isHeadersRawView);
                  }
                }}
                className="p-0.5 rounded hover:bg-primary/20 transition-colors cursor-pointer"
                title={
                  tab.id === 'params'
                    ? isParamsRawView
                      ? 'Switch to table view'
                      : 'Switch to raw view'
                    : isHeadersRawView
                      ? 'Switch to table view'
                      : 'Switch to raw view'
                }
              >
                <Code className="w-3 h-3" />
              </span>
            )}

            {tab.count !== undefined && tab.count > 0 && (
              <span
                className={cn(
                  'px-1.5 rounded text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center',
                  tab.error ? 'bg-error/20 text-error' : 'bg-primary/20 text-primary',
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}

        {/* Clear history button - only show when history tab active */}
        {activeTab === 'history' && (
          <button
            onClick={handleClearHistory}
            className="ml-auto mr-3 p-1.5 rounded hover:bg-error/10 transition-colors shrink-0"
            title="Clear all history"
          >
            <Trash2 className="w-4 h-4 text-text-secondary hover:text-error" />
          </button>
        )}

        {/* Format button - show when in raw view (params/headers) or body tab */}
        {((activeTab === 'params' && isParamsRawView) ||
          (activeTab === 'headers' && isHeadersRawView) ||
          activeTab === 'body') && (
          <button
            onClick={() => {
              if (activeTab === 'params') {
                paramsCodeBlockRef.current?.format();
              } else if (activeTab === 'headers') {
                headersCodeBlockRef.current?.format();
              } else if (activeTab === 'body') {
                bodyCodeBlockRef.current?.format();
              }
            }}
            className="ml-auto mr-3 p-1.5 rounded hover:bg-primary/20 transition-colors"
            title="Format JSON"
          >
            <TextAlignJustify className="w-4 h-4 text-text-secondary hover:text-text-primary" />
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'params' && (
          <ParamTab
            params={params}
            onChange={setParams}
            placeholderKey="Parameter name"
            placeholderValue="Parameter value"
            payloads={payloads}
            onSwitchToPayload={() => setActiveTab('payload')}
            isRawView={isParamsRawView}
            targetId={targetId}
            codeBlockRef={paramsCodeBlockRef}
          />
        )}
        {activeTab === 'headers' && (
          <HeaderTab
            headers={headers}
            onChange={setHeaders}
            payloads={payloads}
            onSwitchToPayload={() => setActiveTab('payload')}
            isRawView={isHeadersRawView}
            targetId={targetId}
            codeBlockRef={headersCodeBlockRef}
          />
        )}
        {activeTab === 'body' && (
          <BodyTab
            code={body}
            onChange={setBody}
            codeBlockRef={bodyCodeBlockRef}
            targetId={targetId}
          />
        )}
        {activeTab === 'payload' && (
          <PayloadTab
            payloads={payloads}
            onChange={setPayloads}
            onUpload={handleUploadPayloads}
            onExport={handleExportPayloads}
            targetId={targetId}
            onDeletePayload={handleDeletePayload}
            onNavigateToVariable={handleNavigateToVariable}
          />
        )}
        {activeTab === 'history' && (
          <HistoryTab
            entries={history}
            onSelect={() => {}} // No longer needed
            onClear={handleClearHistory}
            onDelete={handleDeleteHistory}
            payloads={payloads}
            onSwitchToResult={() => {}}
            onViewResponse={() => {}} // No longer needed
            onViewRuns={handleViewRuns}
          />
        )}
      </div>

      <PayloadPreviewModal
        isOpen={isPreviewOpen}
        enabledPayloads={runEnabledPayloads}
        params={params}
        headers={headers}
        body={body}
        method={method}
        url={url}
        onStart={handleStartRun}
        onClose={() => setIsPreviewOpen(false)}
      />

      <ProgressModal
        isOpen={isProgressOpen}
        totalRequests={runTotalRequests}
        results={runResults}
        currentProgress={runProgress}
        currentLabel={runLabel}
        onCancel={handleCancelRun}
        onClose={() => setIsProgressOpen(false)}
      />

      <ResultsModal
        isOpen={payloadResultData !== null}
        results={payloadResultData || []}
        onClose={() => setPayloadResultData(null)}
        onSave={handleSavePayloadResults}
      />

      {/* History Runs Modal - View only, no save */}
      <ResultsModal
        isOpen={historyRunsModal.isOpen}
        results={historyRunsModal.runs}
        onClose={() => setHistoryRunsModal({ isOpen: false, runs: [] })}
      />
    </div>
  );
}
