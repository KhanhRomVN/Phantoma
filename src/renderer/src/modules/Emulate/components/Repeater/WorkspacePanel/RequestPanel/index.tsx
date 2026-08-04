import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../../../../../shared/lib/utils';
import { NetworkRequest } from '../../../Home/Filter';
import { CodeBlockRef } from '../../../../../../components/common/CodeBlock';
import { ParamTab } from './TabContent/ParamTab';
import { HeaderTab } from './TabContent/HeaderTab';
import { BodyTab } from './TabContent/BodyTab';
import { PayloadTab } from './TabContent/PayloadTab';
import { HistoryTab } from './TabContent/HistoryTab';
import { ResultTab } from './TabContent/ResultTab';
import { ResponsePanel } from '../ResponsePanel';
import { RequestBar } from './RequestBar';
import type { ParamItem, PayloadItem, HistoryEntry, TabType } from './types';

interface RequestPanelProps {
  request: NetworkRequest | null;
  lastRunTimestamp?: number | null;
  saveToHistory?: boolean;
  onSaveToggle?: () => void;
  onRun?: () => void;
  onSaveSession?: () => void;
  onSwitchTab?: (tab: TabType) => void;
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
  onSaveSession,
  onSwitchTab,
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

    // Tạo payloads mới cho những detectedNames chưa có
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

    // Chỉ cập nhật nếu có thay đổi (thêm mới hoặc cần xóa auto-created cũ)
    const needsCleanup = payloads.some(
      (p) =>
        p.description?.startsWith('Auto-created from') && !detectedNames.has(p.name),
    );

    if (newPayloads.length > 0 || needsCleanup) {
      setPayloads((prev) => {
        // Giữ payloads thủ công + auto-created vẫn còn trong detectedNames
        const kept = prev.filter((p) => {
          if (!p.description?.startsWith('Auto-created from')) return true;
          return detectedNames.has(p.name);
        });
        return [...kept, ...newPayloads];
      });
    }
  }, [params, headers, body]);

  // History — RAM only, lost on restart
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [selectedHistory, setSelectedHistory] = useState<HistoryEntry | null>(null);

  // Execution state
  const [isExecuting, setIsExecuting] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('params');
  const [response, setResponse] = useState<{
    headers?: Record<string, string>;
    body?: string;
    status?: number;
    contentType?: string;
  } | null>(null);

  // Sync response when viewHistoryEntry changes
  useEffect(() => {
    if (viewHistoryEntry) {
      setResponse({
        headers: viewHistoryEntry.responseHeaders,
        body: viewHistoryEntry.responseBody,
        status: viewHistoryEntry.status,
      });
    }
  }, [viewHistoryEntry]);
  const [isMethodDropdownOpen, setIsMethodDropdownOpen] = useState(false);
  const methodDropdownRef = useRef<HTMLDivElement>(null);
  const bodyCodeBlockRef = useRef<CodeBlockRef>(null);

  // Timestamp and history save - use external state if provided
  const [, setInternalLastRunTimestamp] = useState<number | null>(null);
  const [internalSaveToHistory] = useState(true);

  const saveToHistory =
    externalSaveToHistory !== undefined ? externalSaveToHistory : internalSaveToHistory;

  // Modal state
  const [showRunModal, setShowRunModal] = useState(false);
  const [totalRequests, setTotalRequests] = useState(0);
  const [modalMessage, setModalMessage] = useState('');

  // Auto-fill from selected request
  useEffect(() => {
    if (request) {
      // Reset payloads when a new request is loaded — payloads are auto-detected
      // from ${name} patterns, not persisted globally
      setInternalPayloads([]);

      const requestUrl = request.url || '';
      setUrl(requestUrl);
      setMethod(request.method || 'GET');

      // Parse URL query params
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
        // Set clean URL without query params
        setUrl(requestUrl.split('?')[0]);
      } catch (error) {
        // If URL parsing fails, leave params empty
        setParams([]);
      }

      // Parse headers
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
      }

      setBody(
        typeof request.requestBody === 'string'
          ? request.requestBody
          : request.requestBody
            ? JSON.stringify(request.requestBody)
            : '',
      );
    }
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

    // Build URL with query params
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

    // If payload is provided, substitute ${payload_name} in body, headers, and params
    if (payload) {
      const activePayload = payloads.find((p) => p.enabled && p.values.includes(payload));
      if (activePayload) {
        const escapedName = activePayload.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp('\\$\\{' + escapedName + '\\}', 'g');

        // Substitute in body
        finalBody = finalBody.replace(regex, payload);

        // Substitute in headers
        Object.keys(finalHeaders).forEach((key) => {
          finalHeaders[key] = finalHeaders[key].replace(regex, payload);
        });

        // Substitute in params
        Object.keys(finalParams).forEach((key) => {
          finalParams[key] = finalParams[key].replace(regex, payload);
        });
      }
    }

    // Rebuild URL with substituted params
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
      const result = await (window as any).api.invoke('inspector:send-request', {
        url: executionUrl,
        method,
        headers: finalHeaders,
        body: method !== 'GET' && finalBody ? finalBody : undefined,
      });

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

  const handleSend = async () => {
    if (!url) return;

    // Calculate total requests from payloads
    const enabledPayloads = payloads.filter((p) => p.enabled && p.values.length > 0);
    let total = 1; // Default: 1 request (no payloads)
    if (enabledPayloads.length > 0) {
      total = enabledPayloads.reduce((acc, p) => acc * p.values.length, 1);
    }

    setTotalRequests(total);
    setModalMessage(
      'This will send ' + total + ' request' + (total > 1 ? 's' : '') + ' with all payload combinations. Continue?',
    );
    setShowRunModal(true);
  };

  const handleConfirmSend = async () => {
    setShowRunModal(false);
    const timestamp = Date.now();
    if (externalLastRunTimestamp === undefined) {
      setInternalLastRunTimestamp(timestamp);
    }
    if (onRun) onRun();

    const enabledPayloads = payloads.filter((p) => p.enabled && p.values.length > 0);
    if (enabledPayloads.length === 0) {
      await executeRequest(undefined, true); // Skip history for Send button
      return;
    }

    // Run all combinations - skip history for Send button
    const statusCounts: Record<number, number> = {};
    let firstResult: any = null;
    const allValues: string[] = [];
    for (const payload of enabledPayloads) {
      for (const value of payload.values) {
        allValues.push(value);
        try {
          const result = await executeRequest(value, true);
          const s = result.status || 0;
          statusCounts[s] = (statusCounts[s] || 0) + 1;
          if (!firstResult) firstResult = result;
        } catch {
          statusCounts[0] = (statusCounts[0] || 0) + 1;
        }
      }
    }
    const entry: HistoryEntry = {
      id: crypto.randomUUID(),
      method,
      url,
      status: firstResult?.status || 0,
      statuses: statusCounts,
      timestamp: Date.now(),
      duration: 0,
      payload: allValues.join(', '),
      payloadCount: allValues.length,
      requestHeaders: Object.fromEntries(headers.filter((h) => h.enabled && h.key).map((h) => [h.key, h.value])),
      requestBody: method !== 'GET' ? body : undefined,
      responseHeaders: firstResult?.headers,
      responseBody: firstResult?.body,
    };
    setHistory((prev) => [entry, ...prev]);
    setSelectedHistory(entry);
  };

  const handleSaveSession = () => {
    if (!response || !url) return;
    const entry: HistoryEntry = {
      id: crypto.randomUUID(),
      method,
      url,
      status: response.status || 0,
      timestamp: Date.now(),
      duration: 0,
      payload: '',
      requestHeaders: Object.fromEntries(headers.filter((h) => h.enabled && h.key).map((h) => [h.key, h.value])),
      requestBody: method !== 'GET' ? body : undefined,
      responseHeaders: response.headers,
      responseBody: response.body,
    };
    setHistory((prev) => [entry, ...prev]);
    setSelectedHistory(entry);
    onSaveSession?.();
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
    });
  };

  const handleSwitchToResult = () => {
    setActiveTab('result');
    if (onSwitchTab) onSwitchTab('result');
  };

  const handleViewResponse = (entry: HistoryEntry) => {
    setSelectedHistory(entry);
    setResponse({
      headers: entry.responseHeaders,
      body: entry.responseBody,
      status: entry.status,
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
        // Try to parse as CSV with name,description,values
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
        // Fallback: treat as just values
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

  const tabs: { id: TabType; label: React.ReactNode; count?: number }[] = [
    { id: 'params', label: 'Params', count: params.filter((p) => p.enabled && p.key).length },
    { id: 'headers', label: 'Headers', count: headers.filter((h) => h.enabled && h.key).length },
    { id: 'body', label: 'Body' },
    { id: 'payload', label: 'Payload', count: payloads.filter((p) => p.enabled).length },
    {
      id: 'result',
      label: 'Result',
      count: (() => {
        const enabled = payloads.filter((p) => p.enabled && p.values.length > 0);
        return enabled.length > 0
          ? enabled.reduce((acc, p) => acc * p.values.length, 1)
          : undefined;
      })(),
    },
    { id: 'history', label: 'History', count: history.length },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Section 1: Toolbar */}
      <RequestBar
        method={method}
        url={url}
        isExecuting={isExecuting}
        methods={methods}
        isMethodDropdownOpen={isMethodDropdownOpen}
        methodDropdownRef={methodDropdownRef}
        onMethodChange={setMethod}
        onUrlChange={setUrl}
        onToggleDropdown={() => setIsMethodDropdownOpen(!isMethodDropdownOpen)}
        onSend={handleSend}
        readOnly={readOnly}
      />

      {/* Section 2: Tabs */}
      <div className="flex items-center border-b border-border shrink-0 bg-table-headerBg/50 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 h-8 text-xs font-medium whitespace-nowrap transition-all border-b-2',
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
        ) : externalLastRunTimestamp && externalSaveToHistory ? (
          <span
            className="ml-auto mr-3 text-[10px] text-text-secondary hover:text-primary transition-colors cursor-pointer shrink-0"
            onClick={handleSaveSession}
          >
            Do you want to save this session{' '}
            <span className="text-primary">
              {new Date(externalLastRunTimestamp).toLocaleTimeString()}
            </span>
            ? Click to save!
          </span>
        ) : null}
      </div>

      {/* Section 2 Content */}
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
          />
        )}
        {activeTab === 'headers' && (
          <HeaderTab
            headers={headers}
            readOnly={readOnly}
            onChange={setHeaders}
            payloads={payloads}
            onSwitchToPayload={() => setActiveTab('payload')}
          />
        )}
        {activeTab === 'body' && (
          <BodyTab code={body} onChange={setBody} codeBlockRef={bodyCodeBlockRef} readOnly={readOnly} />
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
            onSwitchToResult={handleSwitchToResult}
            onViewResponse={handleViewResponse}
            onViewHistory={handleViewHistory}
          />
        )}
        {activeTab === 'result' && <ResultTab payloads={payloads} />}
      </div>

      {/* Section 3: Response Viewer */}
      <div className="min-h-[180px] border-t border-border shrink-0">
        <ResponsePanel
          headers={response?.headers}
          body={response?.body}
          status={response?.status}
          contentType={response?.contentType}
        />
      </div>

      {/* Run confirmation modal */}
      {showRunModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background border border-border rounded-lg shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="text-sm font-medium text-text-primary">Confirm Execution</h3>
              <button
                onClick={() => setShowRunModal(false)}
                className="p-1 rounded hover:bg-dropdown-item-hover"
              >
                <X className="w-4 h-4 text-text-secondary" />
              </button>
            </div>
            <div className="px-4 py-6">
              <div className="text-center">
                <div className="text-4xl mb-3">🚀</div>
                <p className="text-sm text-text-primary mb-2">{modalMessage}</p>
                <p className="text-xs text-text-secondary">
                  {totalRequests > 1 ? (
                    <>
                      Total requests:{' '}
                      <span className="font-bold text-primary text-base">{totalRequests}</span>
                    </>
                  ) : (
                    'Single request (no active payloads)'
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border">
              <button
                onClick={() => setShowRunModal(false)}
                className="px-3 py-1.5 rounded text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-dropdown-item-hover transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSend}
                className="px-3 py-1.5 rounded text-xs font-medium bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
              >
                Run Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}