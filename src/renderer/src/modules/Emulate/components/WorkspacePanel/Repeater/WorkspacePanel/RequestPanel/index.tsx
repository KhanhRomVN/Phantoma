import { useState, useEffect, useRef } from 'react';
import { Code } from 'lucide-react';

// ── Components ──
import { ParamTab } from './TabContent/ParamTab';
import { HeaderTab } from './TabContent/HeaderTab';
import { BodyTab } from './TabContent/BodyTab';
import { PayloadTab } from './TabContent/PayloadTab';
import { HistoryTab } from './TabContent/HistoryTab';
import { ResponsePanel } from '../ResponsePanel';
import { RunModal } from './modal/RunModal';
import { PayloadResultModal } from '../ResponsePanel/modal/PayloadResultModal';
import { RequestBar } from './RequestBar';
import { CodeBlockRef } from '@renderer/components/common/CodeBlock';

// ── Types ──
import { NetworkRequest } from '../../../Home/Filter';
import type {
  ParamItem,
  PayloadItem,
  HistoryEntry,
  RepeaterTab,
  RunResult,
} from '../../../../../types/repeater.types';

// ── Hooks ──
import { useRepeaterPersistence } from '../../../../../hooks/repeater/useRepeaterPersistence';

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
  viewHistoryEntry?: HistoryEntry | null;
  onViewHistory?: (entry: HistoryEntry) => void;
  onExitView?: () => void;
}

export function RequestPanel({
  request,
  lastRunTimestamp: externalLastRunTimestamp,
  saveToHistory: externalSaveToHistory,
  onRun,
  payloads: externalPayloads,
  targetId,
  viewHistoryEntry = null,
  onViewHistory,
  onExitView,
}: RequestPanelProps) {
  // Request config
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('');
  const [params, setParams] = useState<ParamItem[]>([]);
  const [headers, setHeaders] = useState<ParamItem[]>([]);
  const [body, setBody] = useState('');
  // Ưu tiên dữ liệu network store khi request có headers/params/body
  const [hasNetworkData, setHasNetworkData] = useState(false);

  // View history mode
  const readOnly = viewHistoryEntry !== null;

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

  // Auto-detect and sync payloads from ${name} patterns in params/headers/body
  useEffect(() => {
    const allValues = [...params.map((p) => p.value), ...headers.map((h) => h.value), body].join(
      ' ',
    );

    const RE_VAR = /\$\{([^}]+)\}/g;
    const detectedNames = new Set<string>();
    let match: RegExpExecArray | null;
    while ((match = RE_VAR.exec(allValues)) !== null) {
      detectedNames.add(match[1]);
    }

    const newPayloads: PayloadItem[] = [];
    detectedNames.forEach((name) => {
      if (!payloads.some((p) => p.name === name)) {
        newPayloads.push({
          id: crypto.randomUUID(),
          name,
          description: 'Auto-created from ${' + name + '}',
          values: [],
          enabled: true,
        });
      }
    });

    const needsCleanup = payloads.some(
      (p) => p.description?.startsWith('Auto-created from') && !detectedNames.has(p.name),
    );

    if (newPayloads.length > 0 || needsCleanup) {
      setPayloads((prev) => {
        const kept = prev.filter((p) => {
          if (!p.description?.startsWith('Auto-created from')) return true;
          return detectedNames.has(p.name);
        });
        return [...kept, ...newPayloads];
      });
    }
  }, [params, headers, body]);

  // History
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [selectedHistory, setSelectedHistory] = useState<HistoryEntry | null>(null);

  // Execution state
  const [isExecuting, setIsExecuting] = useState(false);
  const [activeTab, setActiveTab] = useState<RepeaterTab>('params');
  const [response, setResponse] = useState<{
    headers?: Record<string, string>;
    body?: string;
    status?: number;
    contentType?: string;
    duration?: number;
  } | null>(null);

  // View mode state (table vs raw)
  const [isParamsRawView, setIsParamsRawView] = useState(false);
  const [isHeadersRawView, setIsHeadersRawView] = useState(false);

  // Sync response when viewHistoryEntry changes
  useEffect(() => {
    if (viewHistoryEntry) {
      setResponse({
        headers: viewHistoryEntry.responseHeaders,
        body: viewHistoryEntry.responseBody,
        status: viewHistoryEntry.status,
        duration: viewHistoryEntry.duration,
      });
    }
  }, [viewHistoryEntry]);
  const bodyCodeBlockRef = useRef<CodeBlockRef>(null);

  const [, setInternalLastRunTimestamp] = useState<number | null>(null);
  const [internalSaveToHistory] = useState(true);

  const saveToHistory =
    externalSaveToHistory !== undefined ? externalSaveToHistory : internalSaveToHistory;

  // Run modal state
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);
  const [runTotalRequests, setRunTotalRequests] = useState(0);
  const [runEnabledPayloads, setRunEnabledPayloads] = useState<PayloadItem[]>([]);
  const [payloadResultData, setPayloadResultData] = useState<RunResult[] | null>(null);

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

  // Auto-save payloads khi có thay đổi (debounce 1s)
  useEffect(() => {
    if (!targetId) return;
    const timer = setTimeout(() => {
      persistence.savePayloads();
    }, 1000);
    return () => clearTimeout(timer);
  }, [payloads, targetId]);

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
      setResponse({
        headers: result.headers,
        body: result.body,
        status: result.status,
        contentType: result.headers?.['content-type'] || result.headers?.['Content-Type'],
        duration,
      });
      setSelectedHistory(entry);
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
    const total = enabledPayloads.reduce((acc, p) => acc * p.values.length, 1);
    setRunTotalRequests(total);
    setRunEnabledPayloads(enabledPayloads);
    setIsRunModalOpen(true);
  };

  // Called by RunModal when user clicks Start
  const handleRunStart = async (
    onProgress: (item: RunResult) => void,
    cancelledRef: React.MutableRefObject<boolean>,
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

    const statusCounts: Record<number, number> = {};
    let firstResult: SendRequestResult | null = null;
    const allValues: string[] = [];

    for (const payload of enabledPayloads) {
      for (const value of payload.values) {
        if (cancelledRef.current) break;
        allValues.push(value);
        const reqStart = Date.now();
        try {
          const result = await executeRequest(value, true);
          const s = result.status || 0;
          const d = Date.now() - reqStart;
          statusCounts[s] = (statusCounts[s] || 0) + 1;
          if (!firstResult) firstResult = result;
          const item: RunResult = {
            payloadName: payload.name,
            value,
            status: s,
            duration: d,
            method,
            url,
            params: Object.fromEntries(
              params.filter((p) => p.enabled && p.key).map((p) => [p.key, p.value]),
            ),
            requestHeaders: Object.fromEntries(
              headers.filter((h) => h.enabled && h.key).map((h) => [h.key, h.value]),
            ),
            requestBody: method !== 'GET' ? body : '',
            responseHeaders: result.headers || {},
            responseBody: result.body || '',
          };
          results.push(item);
          onProgress(item);
        } catch {
          statusCounts[0] = (statusCounts[0] || 0) + 1;
          const item: RunResult = {
            payloadName: payload.name,
            value,
            status: 0,
            duration: Date.now() - reqStart,
            method,
            url,
            params: Object.fromEntries(
              params.filter((p) => p.enabled && p.key).map((p) => [p.key, p.value]),
            ),
            requestHeaders: Object.fromEntries(
              headers.filter((h) => h.enabled && h.key).map((h) => [h.key, h.value]),
            ),
            requestBody: method !== 'GET' ? body : '',
            responseHeaders: {},
            responseBody: '',
          };
          results.push(item);
          onProgress(item);
        }
      }
      if (cancelledRef.current) break;
    }
    return results;
  };

  const handleSavePayloadResults = () => {
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
    persistence.saveHistory(entry, payloadResultData);
    setHistory((prev) => [entry, ...prev]);
    setSelectedHistory(entry);
    setPayloadResultData(null);
  };

  const handleViewHistory = (entry: HistoryEntry) => {
    onViewHistory?.(entry);
  };

  const handleExitView = () => {
    onExitView?.();
  };

  const handleSelectHistory = (entry: HistoryEntry) => {
    setSelectedHistory(entry);
    setResponse({
      headers: entry.responseHeaders,
      body: entry.responseBody,
      status: entry.status,
      duration: entry.duration,
    });
  };

  const handleViewResponse = (entry: HistoryEntry) => {
    setSelectedHistory(entry);
    setResponse({
      headers: entry.responseHeaders,
      body: entry.responseBody,
      status: entry.status,
      duration: entry.duration,
    });
  };

  const handleDeleteHistory = (id: string) => {
    setHistory((prev) => prev.filter((h) => h.id !== id));
    if (selectedHistory?.id === id) {
      setSelectedHistory(null);
      setResponse(null);
    }
  };

  const handleClearHistory = () => {
    setHistory([]);
    setSelectedHistory(null);
    setResponse(null);
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

  const tabs: { id: RepeaterTab; label: React.ReactNode; count?: number }[] = [
    { 
      id: 'params', 
      label: (
        <div className="flex items-center gap-1.5">
          <span>Params</span>
          <span
            onClick={(e) => {
              e.stopPropagation();
              setIsParamsRawView(!isParamsRawView);
            }}
            className="p-0.5 rounded hover:bg-primary/20 transition-colors cursor-pointer"
            title={isParamsRawView ? "Switch to table view" : "Switch to raw view"}
          >
            <Code className="w-3 h-3" />
          </span>
        </div>
      ), 
      count: params.filter((p) => p.enabled && p.key).length 
    },
    { 
      id: 'headers', 
      label: (
        <div className="flex items-center gap-1.5">
          <span>Headers</span>
          <span
            onClick={(e) => {
              e.stopPropagation();
              setIsHeadersRawView(!isHeadersRawView);
            }}
            className="p-0.5 rounded hover:bg-primary/20 transition-colors cursor-pointer"
            title={isHeadersRawView ? "Switch to table view" : "Switch to raw view"}
          >
            <Code className="w-3 h-3" />
          </span>
        </div>
      ), 
      count: headers.filter((h) => h.enabled && h.key).length 
    },
    { id: 'body', label: 'Body' },
    { id: 'payload', label: 'Payload', count: payloads.filter((p) => p.enabled).length },
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
        readOnly={readOnly}
        hasEmptyPayload={payloads.some((p) => p.enabled && p.values.length === 0)}
      />

      <div className="flex items-center border-b border-border shrink-0 bg-table-headerBg/50 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 h-8 text-sm font-medium whitespace-nowrap transition-all border-b-2',
              activeTab === tab.id
                ? 'border-primary text-text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-dropdown-item-hover/30',
            )}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="bg-primary/20 text-primary px-1.5 py-0.5 rounded text-[10px] font-bold">
                {tab.count}
              </span>
            )}
          </button>
        ))}
        {viewHistoryEntry ? (
          <span
            className="ml-auto mr-3 text-[10px] text-text-secondary hover:text-primary transition-colors cursor-pointer shrink-0"
            onClick={handleExitView}
          >
            Đang xem lịch sử — Click để thoát
          </span>
        ) : null}
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'params' && (
          <ParamTab
            params={params}
            onChange={setParams}
            placeholderKey="Parameter name"
            placeholderValue="Parameter value"
            readOnly={readOnly}
            payloads={payloads}
            onSwitchToPayload={() => setActiveTab('payload')}
            isRawView={isParamsRawView}
          />
        )}
        {activeTab === 'headers' && (
          <HeaderTab
            headers={headers}
            readOnly={readOnly}
            onChange={setHeaders}
            payloads={payloads}
            onSwitchToPayload={() => setActiveTab('payload')}
            isRawView={isHeadersRawView}
          />
        )}
        {activeTab === 'body' && (
          <BodyTab
            code={body}
            onChange={setBody}
            codeBlockRef={bodyCodeBlockRef}
            readOnly={readOnly}
          />
        )}
        {activeTab === 'payload' && (
          <PayloadTab
            payloads={payloads}
            onChange={setPayloads}
            onUpload={handleUploadPayloads}
            onExport={handleExportPayloads}
            targetId={targetId}
          />
        )}
        {activeTab === 'history' && (
          <HistoryTab
            entries={history}
            onSelect={handleSelectHistory}
            onClear={handleClearHistory}
            onDelete={handleDeleteHistory}
            selectedId={selectedHistory?.id}
            payloads={payloads}
            onSwitchToResult={() => {}}
            onViewResponse={handleViewResponse}
            onViewHistory={handleViewHistory}
          />
        )}
      </div>

      <div className="min-h-[180px] border-t border-border shrink-0">
        <ResponsePanel
          headers={response?.headers}
          body={response?.body}
          status={response?.status}
          contentType={response?.contentType}
          duration={response?.duration}
        />
      </div>

      <RunModal
        isOpen={isRunModalOpen}
        totalRequests={runTotalRequests}
        enabledPayloads={runEnabledPayloads}
        onRun={handleRunStart}
        onClose={() => setIsRunModalOpen(false)}
        onViewResults={(results) => {
          setIsRunModalOpen(false);
          setPayloadResultData(results);
        }}
      />

      <PayloadResultModal
        isOpen={payloadResultData !== null}
        results={payloadResultData || []}
        onClose={() => setPayloadResultData(null)}
        onSave={handleSavePayloadResults}
      />
    </div>
  );
}
