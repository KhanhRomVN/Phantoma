import { useState, useEffect, useRef } from 'react';
import { Play, Square, Send, X, Plus, Trash2 } from 'lucide-react';
import { cn } from '../../../../shared/lib/utils';
import { NetworkRequest } from '../Home/Filter';
import { CodeBlock, CodeBlockRef } from '../../../../components/common/CodeBlock';
import { ParamTable } from './ParamTable';
import { HeaderTable } from './HeaderTable';
import { PayloadTable } from './PayloadTable';
import { HistoryList } from './HistoryList';
import { ResponseViewer } from './ResponseViewer';
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
  onRun?: (job: any) => void;
  isRunning?: boolean;
}

type TabType = 'params' | 'headers' | 'body' | 'payload' | 'history';

export function PayloadConfigPanel({ request, onRun, isRunning = false }: PayloadConfigPanelProps) {
  const { getColorByIndex } = useAccentColors();
  // Request config
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('');
  const [params, setParams] = useState<ParamItem[]>([]);
  const [headers, setHeaders] = useState<ParamItem[]>([]);
  const [body, setBody] = useState('');

  // Payload management
  const [payloads, setPayloads] = useState<PayloadItem[]>([]);

  // History
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
  const [isMethodDropdownOpen, setIsMethodDropdownOpen] = useState(false);
  const methodDropdownRef = useRef<HTMLDivElement>(null);
  const bodyCodeBlockRef = useRef<CodeBlockRef>(null);

  // Auto-fill from selected request
  useEffect(() => {
    if (request) {
      setUrl(request.url || '');
      setMethod(request.method || 'GET');

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

      setBody(request.requestBody || '');
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

  const executeRequest = async (payload?: string) => {
    const { url: finalUrl, headers: headersObj } = buildRequest();
    let finalBody = body;

    // If payload is provided, substitute it in the body
    if (payload && body.includes('§payload§')) {
      finalBody = body.replace(/§payload§/g, payload);
    }

    setIsExecuting(true);
    const startTime = Date.now();

    try {
      const result = await (window as any).api.invoke('inspector:send-request', {
        url: finalUrl,
        method,
        headers: headersObj,
        body: method !== 'GET' && finalBody ? finalBody : undefined,
      });

      const duration = Date.now() - startTime;

      const entry: HistoryEntry = {
        id: crypto.randomUUID(),
        method,
        url: finalUrl,
        status: result.status || 0,
        timestamp: Date.now(),
        duration,
        payload: payload || '',
        requestHeaders: headersObj,
        requestBody: method !== 'GET' ? finalBody : undefined,
        responseHeaders: result.headers,
        responseBody: result.body,
      };

      setHistory((prev) => [entry, ...prev]);
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
        url: finalUrl,
        status: 0,
        timestamp: Date.now(),
        duration,
        payload: payload || '',
        requestHeaders: headersObj,
        requestBody: method !== 'GET' ? finalBody : undefined,
        responseHeaders: {},
        responseBody: '',
      };
      setHistory((prev) => [entry, ...prev]);
      setIsExecuting(false);
      throw error;
    }
  };

  const handleSend = async () => {
    if (!url) return;
    await executeRequest();
  };

  const handleRunAll = async () => {
    const enabledPayloads = payloads.filter((p) => p.enabled && p.values.length > 0);
    if (enabledPayloads.length === 0) {
      await executeRequest();
      return;
    }

    for (const payload of enabledPayloads) {
      for (const value of payload.values) {
        await executeRequest(value);
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
            values: parts[2].split(',').map(v => v.trim()).filter(v => v),
            enabled: true,
          };
        }
        // Fallback: treat as just values
        return {
          id: crypto.randomUUID(),
          name: `Payload ${payloads.length + 1}`,
          description: '',
          values: line.split(',').map(v => v.trim()).filter(v => v),
          enabled: true,
        };
      });

      setPayloads((prev) => [...prev, ...newPayloads]);
    };
    reader.readAsText(file);
  };

  const handleExportPayloads = () => {
    const content = payloads.map((p) => 
      [p.name, p.description, p.values.join(', ')].join('\t')
    ).join('\n');
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
            <div className="absolute top-full left-0 mt-1 min-w-[120px] bg-modal-background border border-border rounded-lg shadow-xl z-50 py-1">
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
                      m === method
                        ? 'bg-primary/10'
                        : 'hover:bg-dropdown-item-hover'
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
      <div className="flex items-center border-b border-border shrink-0 bg-table-headerBg overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 h-9 text-xs font-medium whitespace-nowrap transition-all border-b-2',
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
          />
        )}
        {activeTab === 'headers' && (
          <HeaderTable
            headers={headers}
            onChange={setHeaders}
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
          />
        )}
        {activeTab === 'history' && (
          <HistoryList
            entries={history}
            onSelect={handleSelectHistory}
            onClear={handleClearHistory}
            onDelete={handleDeleteHistory}
            selectedId={selectedHistory?.id}
          />
        )}
      </div>

      {/* Section 3: Execution Panel */}
      <div className="flex h-60 min-h-[180px] border-t border-border shrink-0">
        {/* Left: Payload execution list */}
        <div className="w-64 shrink-0 border-r border-border flex flex-col bg-muted/5">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-border shrink-0 bg-table-headerBg">
            <span className="text-[10px] font-bold text-text-secondary uppercase">Payloads</span>
            <div className="flex items-center gap-1">
              {payloads.filter((p) => p.enabled && p.values.length > 0).length > 0 && (
                <button
                  onClick={handleRunAll}
                  disabled={isExecuting}
                  className={cn(
                    'flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-all',
                    isExecuting
                      ? 'text-text-secondary cursor-not-allowed'
                      : 'text-success hover:bg-success/10',
                  )}
                >
                  <Play className="w-3 h-3" /> Run all
                </button>
              )}
              <button
                onClick={() => setPayloads((prev) => prev.filter((p) => p.enabled))}
                className="text-[10px] text-text-secondary hover:text-error transition-colors"
                title="Remove disabled payloads"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-1 space-y-0.5">
            {payloads.filter((p) => p.enabled && p.values.length > 0).length === 0 ? (
              <div className="flex items-center justify-center h-full text-text-secondary text-xs">
                No payloads with values enabled
              </div>
            ) : (
              payloads
                .filter((p) => p.enabled && p.values.length > 0)
                .map((p, index) => (
                  <button
                    key={p.id}
                    onClick={() => executeRequest(p.values[0])}
                    className="w-full text-left px-2 py-1 rounded text-xs text-text-primary hover:bg-dropdown-item-hover/50 transition-colors flex items-center gap-2"
                  >
                    <span className="text-text-secondary shrink-0">#{index + 1}</span>
                    <span className="font-medium truncate max-w-[80px]">{p.name || 'Unnamed'}</span>
                    <span className="text-text-secondary text-[10px] truncate flex-1">
                      {p.values.slice(0, 3).join(', ')}{p.values.length > 3 ? `... (+${p.values.length - 3})` : ''}
                    </span>
                  </button>
                ))
            )}
          </div>
        </div>

        {/* Right: Response viewer */}
        <div className="flex-1 min-w-0">
          <ResponseViewer
            headers={response?.headers}
            body={response?.body}
            status={response?.status}
            contentType={response?.contentType}
          />
        </div>
      </div>
    </div>
  );
}
