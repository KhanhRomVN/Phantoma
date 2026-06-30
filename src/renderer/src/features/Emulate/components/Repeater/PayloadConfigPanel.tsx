import { useState, useEffect, useRef } from 'react';
import { Square, Send, X } from 'lucide-react';
import { cn } from '../../../../shared/lib/utils';
import { NetworkRequest } from '../Home/Filter';
import { CodeBlock, CodeBlockRef } from '../../../../components/common/CodeBlock';
import { ParamTable } from './ParamTable';
import { HeaderTable } from './HeaderTable';
import { PayloadTable } from './PayloadTable';
import { HistoryList } from './HistoryList';
import { ResponseViewer } from './ResponseViewer';
import { ResultTab } from './ResultTab';
import { useAccentColors } from '../../../../shared/hooks/useAccentColors';

interface ParamItem {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

interface PayloadItem {
  id: string;
  name: string;
  description: string;
  values: string[];
  enabled: boolean;
}

interface HistoryEntry {
  id: string;
  method: string;
  url: string;
  status: number;
  timestamp: number;
  duration: number;
  payload: string;
  requestHeaders?: Record<string, string>;
  requestBody?: string;
  responseHeaders?: Record<string, string>;
  responseBody?: string;
}

interface PayloadConfigPanelProps {
  request: NetworkRequest | null;
  lastRunTimestamp?: number | null;
  saveToHistory?: boolean;
  onSaveToggle?: () => void;
  onRun?: () => void;
  onSwitchTab?: (tab: TabType) => void;
  payloads?: PayloadItem[];
  targetId?: string | null;
}

type TabType = 'params' | 'headers' | 'body' | 'payload' | 'history' | 'result';

export function PayloadConfigPanel({
  request,
  lastRunTimestamp: externalLastRunTimestamp,
  saveToHistory: externalSaveToHistory,
  onRun,
  onSwitchTab,
  payloads: externalPayloads,
  targetId,
}: PayloadConfigPanelProps) {
  const { getColorByIndex } = useAccentColors();
  // Request config
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('');
  const [params, setParams] = useState<ParamItem[]>([]);
  const [headers, setHeaders] = useState<ParamItem[]>([]);
  const [body, setBody] = useState('');

  // Payload management - use external if provided
  const [internalPayloads, setInternalPayloads] = useState<PayloadItem[]>(() => {
    if (externalPayloads !== undefined) return externalPayloads;
    return loadFromStorage(getStorageKey('payloads'), []);
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

    if (externalPayloads !== undefined) {
      setInternalPayloads(result);
    } else {
      setInternalPayloads(result);
    }
    // Save to storage
    saveToStorage(getStorageKey('payloads'), result);
  };

  // Auto-detect and create payloads from ${name} patterns
  useEffect(() => {
    const allValues = [...params.map((p) => p.value), ...headers.map((h) => h.value), body].join(
      ' ',
    );

    // Extract all ${name} patterns
    const matches = allValues.matchAll(/\$\{([^}]+)\}/g);
    const detectedNames = new Set<string>();

    for (const match of matches) {
      detectedNames.add(match[1]);
    }

    console.log('🔍 Auto-detect payloads:', {
      detectedNames: Array.from(detectedNames),
      existingPayloads: payloads.map((p) => p.name),
    });

    // Create missing payloads
    const newPayloads: PayloadItem[] = [];
    detectedNames.forEach((name) => {
      if (!payloads.some((p) => p.name === name)) {
        console.log('✨ Auto-creating payload:', name);
        newPayloads.push({
          id: crypto.randomUUID(),
          name,
          description: `Auto-created from \${${name}}`,
          values: [],
          enabled: true,
        });
      }
    });

    if (newPayloads.length > 0) {
      setPayloads((prev) => [...prev, ...newPayloads]);
    }
  }, [params, headers, body]);

  // Storage utilities
  const getStorageKey = (type: string): string => {
    const base = targetId ? `repeater-${targetId}` : 'repeater-default';
    return `${base}-${type}`;
  };

  const loadFromStorage = <T,>(key: string, defaultValue: T): T => {
    try {
      const data = localStorage.getItem(key);
      if (data) {
        return JSON.parse(data);
      }
    } catch {}
    return defaultValue;
  };

  const saveToStorage = <T,>(key: string, data: T) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch {}
  };

  // History
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    return loadFromStorage(getStorageKey('history'), []);
  });
  const [selectedHistory, setSelectedHistory] = useState<HistoryEntry | null>(null);

  // Save history to storage whenever it changes
  useEffect(() => {
    saveToStorage(getStorageKey('history'), history);
  }, [history, targetId]);

  // Execution state
  const [isExecuting, setIsExecuting] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('params');
  const [response, setResponse] = useState<{
    headers?: Record<string, string>;
    body?: string;
    status?: number;
    contentType?: string;
  } | null>(null);
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
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
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
        const placeholder = `\${${activePayload.name}}`;

        // Substitute in body
        if (finalBody.includes(placeholder)) {
          finalBody = finalBody.replace(new RegExp(`\\$\\{${activePayload.name}\\}`, 'g'), payload);
        }

        // Substitute in headers
        Object.keys(finalHeaders).forEach((key) => {
          if (finalHeaders[key].includes(placeholder)) {
            finalHeaders[key] = finalHeaders[key].replace(
              new RegExp(`\\$\\{${activePayload.name}\\}`, 'g'),
              payload,
            );
          }
        });

        // Substitute in params
        Object.keys(finalParams).forEach((key) => {
          if (finalParams[key].includes(placeholder)) {
            finalParams[key] = finalParams[key].replace(
              new RegExp(`\\$\\{${activePayload.name}\\}`, 'g'),
              payload,
            );
          }
        });
      }
    }

    // Rebuild URL with substituted params
    let executionUrl = url;
    if (Object.keys(finalParams).length > 0) {
      const queryString = Object.entries(finalParams)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v as string)}`)
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
      `This will send ${total} request${total > 1 ? 's' : ''} with all payload combinations. Continue?`,
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
    for (const payload of enabledPayloads) {
      for (const value of payload.values) {
        await executeRequest(value, true);
      }
    }
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
          name: `Payload ${payloads.length + 1}`,
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

  const tabs: { id: TabType; label: string; count?: number }[] = [
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
      <div className="flex items-center border-b border-border shrink-0 bg-muted/5">
        <div className="relative shrink-0" ref={methodDropdownRef}>
          <button
            onClick={() => setIsMethodDropdownOpen(!isMethodDropdownOpen)}
            className="flex items-center gap-2 h-9 bg-input-background border border-input-border-default px-3 pr-7 text-sm font-mono outline-none hover:border-primary/50 transition-colors"
          >
            {method}
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </button>
          {isMethodDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 min-w-[120px] bg-background border border-border rounded-lg shadow-xl z-50 py-1">
              {methods.map((m, index) => {
                const color = getColorByIndex(index % 10);
                return (
                  <button
                    key={m}
                    onClick={() => {
                      setMethod(m);
                      setIsMethodDropdownOpen(false);
                    }}
                    className={cn(
                      'w-full text-left px-3 py-1.5 text-sm font-mono transition-colors',
                      m === method ? 'bg-primary/10' : 'hover:bg-dropdown-item-hover',
                    )}
                    style={m === method ? { color: color } : undefined}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Enter URL..."
          className="flex-1 h-9 bg-input-background border border-input-border-default px-3 text-sm font-mono"
        />

        <button
          onClick={handleSend}
          disabled={isExecuting || !url}
          className={cn(
            'flex items-center gap-1.5 px-4 h-9 text-sm font-medium transition-all shrink-0',
            isExecuting || !url
              ? 'bg-error/20 text-error cursor-not-allowed'
              : 'bg-primary/20 text-primary hover:bg-primary/30',
          )}
        >
          {isExecuting ? (
            <>
              <Square className="w-4 h-4" /> Sending...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" /> Send
            </>
          )}
        </button>
      </div>

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
      </div>

      {/* Section 2 Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'params' && (
          <ParamTable
            params={params}
            onChange={setParams}
            placeholderKey="Parameter name"
            placeholderValue="Parameter value"
            payloads={payloads}
            onSwitchToPayload={() => setActiveTab('payload')}
          />
        )}
        {activeTab === 'headers' && (
          <HeaderTable
            headers={headers}
            onChange={setHeaders}
            payloads={payloads}
            onSwitchToPayload={() => setActiveTab('payload')}
          />
        )}
        {activeTab === 'body' && (
          <div className="h-full p-2 flex flex-col">
            <div className="flex-1 min-h-0">
              <CodeBlock
                ref={bodyCodeBlockRef}
                code={body}
                onChange={(newBody) => {
                  setBody(newBody);
                  // Auto-format on change using the CodeBlock's format method
                  setTimeout(() => bodyCodeBlockRef.current?.format(), 100);
                }}
                language="json"
                className="h-full"
                showLineNumbers
                wordWrap="on"
              />
            </div>
          </div>
        )}
        {activeTab === 'payload' && (
          <PayloadTable
            payloads={payloads}
            onChange={setPayloads}
            onUpload={handleUploadPayloads}
            onExport={handleExportPayloads}
            targetId={targetId}
          />
        )}
        {activeTab === 'history' && (
          <HistoryList
            entries={history}
            onSelect={handleSelectHistory}
            onClear={handleClearHistory}
            onDelete={handleDeleteHistory}
            selectedId={selectedHistory?.id}
            payloads={payloads}
            onSwitchToResult={handleSwitchToResult}
            onViewResponse={handleViewResponse}
          />
        )}
        {activeTab === 'result' && <ResultTab payloads={payloads} />}
      </div>

      {/* Section 3: Response Viewer */}
      <div className="min-h-[180px] border-t border-border shrink-0">
        <ResponseViewer
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
