import { useState, useRef, useEffect } from 'react';
import { Send, List, Braces, FileText, X, Trash2 } from 'lucide-react';
import { cn } from '../../../../shared/lib/utils';
import { CodeBlock, CodeBlockRef } from '../../../../components/common/CodeBlock';
import { NetworkRequest } from '../../../../types/inspector';
import { MethodBadge } from '../common/MethodBadge';

// KeyValueTable component (merged)
export interface KeyValueItem {
  key: string;
  value: string;
  enabled: boolean;
  description?: string;
}

interface KeyValueTableProps {
  items: KeyValueItem[];
  onChange: (items: KeyValueItem[]) => void;
  title?: string;
  descriptionPlaceholder?: boolean;
  readOnly?: boolean;
}

function KeyValueTable({
  items,
  onChange,
  descriptionPlaceholder = false,
  readOnly = false,
}: KeyValueTableProps) {
  const [keyWidth, setKeyWidth] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);

  const handleAdd = () => {
    if (readOnly) return;
    onChange([...items, { key: '', value: '', enabled: true }]);
  };

  const handleRemove = (index: number) => {
    if (readOnly) return;
    onChange(items.filter((_, i) => i !== index));
  };

  const handleUpdate = (index: number, field: keyof KeyValueItem, value: string | boolean) => {
    if (readOnly) return;
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    onChange(newItems);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartX.current = e.clientX;
    dragStartWidth.current = keyWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const delta = ((e.clientX - dragStartX.current) / containerRect.width) * 100;
      let newWidth = dragStartWidth.current + delta;
      newWidth = Math.min(80, Math.max(20, newWidth));
      setKeyWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div className="flex flex-col h-full w-full" ref={containerRef}>
      <div className="flex flex-col h-full bg-table-bodyBg">
        {/* Table Header */}
        <div className="flex bg-table-headerBg text-xs font-bold text-text-secondary border-b border-border flex-shrink-0 sticky top-0 z-10">
          <div className="w-8 flex items-center justify-center py-2 shrink-0">
            <span className="sr-only">Enabled</span>
          </div>
          <div
            className="px-3 py-2 border-r border-border shrink-0 overflow-hidden text-ellipsis whitespace-nowrap"
            style={{ width: `${keyWidth}%` }}
          >
            Key
          </div>
          <div
            className="w-1 cursor-col-resize hover:bg-primary/50 transition-colors shrink-0"
            onMouseDown={handleMouseDown}
          />
          <div
            className="px-3 py-2 flex-1 overflow-hidden text-ellipsis whitespace-nowrap"
            style={{ width: `${100 - keyWidth}%` }}
          >
            Value
          </div>
          {descriptionPlaceholder && (
            <div className="flex-1 px-3 py-2 border-r border-border shrink-0">Description</div>
          )}
          <div className="w-8 shrink-0"></div>
        </div>

        {/* Table Body */}
        <div className="overflow-y-auto flex-1">
          {items.map((item, i) => (
            <div
              key={i}
              className="flex group border-b border-border/50 last:border-0 hover:bg-table-hoverItemBodyBg transition-colors items-center"
            >
              <div className="w-8 flex items-center justify-center p-1 shrink-0">
                <input
                  type="checkbox"
                  checked={item.enabled}
                  onChange={(e) => handleUpdate(i, 'enabled', e.target.checked)}
                  className="rounded border-border w-3.5 h-3.5 cursor-pointer"
                  disabled={readOnly}
                />
              </div>
              <div
                className="px-3 py-1.5 border-r border-border/50 shrink-0"
                style={{ width: `${keyWidth}%` }}
              >
                <input
                  value={item.key}
                  onChange={(e) => handleUpdate(i, 'key', e.target.value)}
                  placeholder="Key"
                  className="w-full bg-transparent text-xs outline-none focus:bg-muted/20 font-mono"
                  readOnly={readOnly}
                />
              </div>
              <div className="flex-1 px-3 py-1.5" style={{ width: `${100 - keyWidth}%` }}>
                <textarea
                  ref={(el) => {
                    if (el) {
                      el.style.height = '28px';
                      const scrollHeight = el.scrollHeight;
                      const maxHeight = 120;
                      if (scrollHeight > 28) {
                        el.style.height = Math.min(scrollHeight, maxHeight) + 'px';
                      }
                    }
                  }}
                  value={item.value}
                  onChange={(e) => {
                    handleUpdate(i, 'value', e.target.value);
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = '28px';
                    const scrollHeight = target.scrollHeight;
                    const maxHeight = 120;
                    if (scrollHeight > 28) {
                      target.style.height = Math.min(scrollHeight, maxHeight) + 'px';
                    }
                  }}
                  placeholder="Value"
                  className="w-full bg-transparent text-xs outline-none focus:bg-muted/20 font-mono resize-none overflow-y-auto leading-normal"
                  style={{
                    height: '28px',
                    maxHeight: '120px',
                  }}
                  readOnly={readOnly}
                />
              </div>
              {descriptionPlaceholder && (
                <div className="flex-1 px-3 py-1.5 border-r border-border/50 shrink-0">
                  <input
                    value={item.description || ''}
                    onChange={(e) => handleUpdate(i, 'description', e.target.value)}
                    placeholder="Description"
                    className="w-full bg-transparent text-xs outline-none focus:bg-muted/20 text-muted-foreground"
                    readOnly={readOnly}
                  />
                </div>
              )}
              <div className="w-8 flex items-center justify-center shrink-0">
                {!readOnly && (
                  <button
                    onClick={() => handleRemove(i)}
                    className="p-1.5 hover:bg-red-500/10 text-muted-foreground hover:text-red-500 rounded opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Add Row Placeholder */}
          {!readOnly && (
            <div className="flex border-b border-border/50 last:border-0 hover:bg-table-hoverItemBodyBg transition-colors items-center">
              <div className="w-8 p-1 shrink-0"></div>
              <div
                className="px-3 py-1.5 border-r border-border/50 shrink-0"
                style={{ width: `${keyWidth}%` }}
              >
                <input
                  placeholder="Add new key"
                  className="w-full bg-transparent text-xs outline-none font-mono placeholder:text-muted-foreground/50"
                  onFocus={handleAdd}
                />
              </div>
              <div className="flex-1 px-3 py-1.5" style={{ width: `${100 - keyWidth}%` }}></div>
              {descriptionPlaceholder && (
                <div className="flex-1 px-3 py-1.5 border-r border-border/50 shrink-0"></div>
              )}
              <div className="w-8 shrink-0"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ComposerProps {
  appId: string;
  initialRequest?: NetworkRequest | null;
}

export function Composer({ appId, initialRequest }: ComposerProps) {
  const [method, setMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'>(
    (initialRequest?.method as any) || 'GET',
  );
  const [showMethodDropdown, setShowMethodDropdown] = useState(false);
  const methodDropdownRef = useRef<HTMLDivElement>(null);
  const [url, setUrl] = useState(
    initialRequest
      ? `${initialRequest.protocol}://${initialRequest.host}${initialRequest.path}`
      : '',
  );
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [tempName, setTempName] = useState('');
  const [tempDesc, setTempDesc] = useState('');
  const [activeTab, setActiveTab] = useState<'params' | 'headers' | 'body'>('headers');
  const [headers, setHeaders] = useState<Array<{ key: string; value: string; enabled: boolean }>>(
    () => {
      if (initialRequest?.requestHeaders) {
        return Object.entries(initialRequest.requestHeaders).map(([key, value]) => ({
          key,
          value: String(value),
          enabled: true,
        }));
      }
      return [];
    },
  );

  const [body, setBody] = useState(initialRequest?.requestBody || '');
  const [responseTab, setResponseTab] = useState<'body' | 'headers'>('body');
  const responseBlockRef = useRef<CodeBlockRef>(null);
  const bodyEditorRef = useRef<CodeBlockRef>(null);
  const [isBodyEditorReady, setIsBodyEditorReady] = useState(false);
  const [isResponseEditorReady, setIsResponseEditorReady] = useState(false);
  const [requestHistory, setRequestHistory] = useState<
    Array<{
      id: string;
      url: string;
      method: string;
      status: number;
      time: number;
      size: number;
      timestamp: number;
      response: any;
    }>
  >([]);
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [responseHeight, setResponseHeight] = useState(50);
  const [isResponseSaved, setIsResponseSaved] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);

  // Reset state when initialRequest changes
  useEffect(() => {
    if (initialRequest) {
      setMethod((initialRequest.method as any) || 'GET');
      setUrl(`${initialRequest.protocol}://${initialRequest.host}${initialRequest.path}`);
      setBody(initialRequest.requestBody || '');
      if (initialRequest.requestHeaders) {
        setHeaders(
          Object.entries(initialRequest.requestHeaders).map(([key, value]) => ({
            key,
            value: String(value),
            enabled: true,
          })),
        );
      } else {
        setHeaders([]);
      }
      setResponse(null);
      setIsResponseSaved(false);
    }
  }, [initialRequest]);

  const filteredHistory = requestHistory.filter(
    (item) =>
      item.url.toLowerCase().includes(historySearch.toLowerCase()) ||
      item.method.toLowerCase().includes(historySearch.toLowerCase()) ||
      String(item.status).includes(historySearch),
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartX.current = e.clientX;
    dragStartWidth.current = responseHeight;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const delta = ((dragStartX.current - e.clientX) / containerRect.width) * 100;
      let newWidth = dragStartWidth.current + delta;
      newWidth = Math.min(70, Math.max(30, newWidth));
      setResponseHeight(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  useEffect(() => {
    if (!isBodyEditorReady) return;
    if (!body.trim()) return;
    try {
      JSON.parse(body);
      if (bodyEditorRef.current) {
        bodyEditorRef.current.format();
      }
    } catch {
      // Not valid JSON, ignore
    }
  }, [body, isBodyEditorReady]);

  useEffect(() => {
    if (!isResponseEditorReady) return;
    if (response?.body && !response.error && responseBlockRef.current) {
      responseBlockRef.current.format();
    }
  }, [response, isResponseEditorReady]);

  const handleSaveResponse = async () => {
    if (!response || response.error || isResponseSaved) return;
    try {
      const result = await (window as any).api.invoke('collection:save-response', {
        appId,
        request: {
          url,
          method,
          headers: headers.reduce(
            (acc, h) => {
              if (h.key && h.enabled) acc[h.key] = h.value;
              return acc;
            },
            {} as Record<string, string>,
          ),
          body,
        },
        response: {
          status: response.status,
          statusText: response.statusText,
          time: response.time,
          size: response.size,
          headers: response.headers,
          body: response.body,
          timestamp: Date.now(),
        },
      });
      if (result.success) {
        setIsResponseSaved(true);
      }
    } catch (error) {
      console.error('Failed to save response:', error);
    }
  };

  const handleSend = async () => {
    if (!url) return;
    setIsLoading(true);
    setResponse(null);

    try {
      const headersObj: Record<string, string> = {};
      headers.forEach((h) => {
        if (h.key && h.enabled) headersObj[h.key] = h.value;
      });

      const startTime = performance.now();
      const res = await (window as any).api.invoke('inspector:send-request', {
        url,
        method,
        headers: headersObj,
        body: method !== 'GET' ? body : undefined,
      });
      const endTime = performance.now();

      if (res.error) throw new Error(res.error);

      const responseData = {
        status: res.status,
        statusText: res.statusText,
        time: Math.round(endTime - startTime),
        headers: res.headers,
        body: res.body,
        size: res.size,
      };

      setResponse(responseData);

      const historyItem = {
        id: `${Date.now()}-${Math.random()}`,
        url,
        method,
        status: res.status,
        time: responseData.time,
        size: res.size,
        timestamp: Date.now(),
        response: responseData,
      };
      setRequestHistory((prev) => [historyItem, ...prev].slice(0, 20));

      setTimeout(() => responseBlockRef.current?.format(), 100);
    } catch (error: any) {
      setResponse({ error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmSave = () => {
    if (!tempName.trim() || !url) return;

    const headersObj: Record<string, string> = {};
    headers.forEach((h) => {
      if (h.key && h.enabled) headersObj[h.key] = h.value;
    });

    const request: NetworkRequest = {
      id: `composer-${Date.now()}`,
      method,
      protocol: url.startsWith('https') ? 'https' : 'http',
      host: new URL(url).hostname,
      path: new URL(url).pathname + new URL(url).search,
      url,
      status: response?.status || 0,
      type: 'Pending',
      size: response?.size || '0 B',
      time: response?.time || 'Pending',
      timestamp: Date.now(),
      requestHeaders: headersObj,
      responseHeaders: response?.headers || {},
      requestBody: body,
      responseBody: response?.body || '',
    };

    setIsDrawerOpen(false);
    setTempName('');
    setTempDesc('');
  };

  const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const;

  const tabs = [
    { id: 'params', label: 'Params', icon: List },
    { id: 'headers', label: 'Headers', icon: Braces },
    { id: 'body', label: 'Body', icon: FileText },
  ] as const;

  const [params, setParams] = useState<Array<{ key: string; value: string; enabled: boolean }>>([]);

  const renderEditor = () => {
    switch (activeTab) {
      case 'params':
        return (
          <div className="h-full bg-info/5">
            <KeyValueTable items={params} onChange={setParams} />
          </div>
        );
      case 'headers':
        return (
          <div className="h-full bg-success/5">
            <KeyValueTable items={headers} onChange={setHeaders} />
          </div>
        );
      case 'body':
        return (
          <div className="h-full">
            <CodeBlock
              ref={bodyEditorRef}
              code={body}
              language="json"
              className="h-full"
              onChange={setBody}
              onEditorMounted={() => {
                setIsBodyEditorReady(true);
              }}
              editorOptions={{ readOnly: false, minimap: { enabled: false }, fontSize: 12 }}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col bg-table-bodyBg" ref={containerRef}>
      {/* URL Bar */}
      <div className="border-b border-divider shrink-0">
        <div className="flex items-stretch">
          {/* Method Dropdown */}
          <div className="relative" ref={methodDropdownRef}>
            <button
              onClick={() => setShowMethodDropdown(!showMethodDropdown)}
              className="h-10 px-3 border border-input-border-default border-r-0 outline-none cursor-pointer"
            >
              <MethodBadge method={method} size="md" />
            </button>
            {showMethodDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMethodDropdown(false)} />
                <div className="absolute top-full left-0 mt-1 z-50 bg-dialog-background border border-divider rounded-md shadow-lg min-w-[80px] overflow-hidden">
                  {methods.map((m) => (
                    <button
                      key={m}
                      onClick={() => {
                        setMethod(m);
                        setShowMethodDropdown(false);
                      }}
                      className={cn(
                        'w-full px-3 py-2 text-left text-sm font-bold transition-colors hover:bg-sidebar-itemHover',
                        method === m && 'bg-primary/10',
                      )}
                    >
                      <MethodBadge method={m} size="md" />
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* URL Input */}
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://api.example.com/endpoint"
            className="flex-1 h-10 px-3 bg-table-headerBg border-y border-input-border-default text-sm text-text-primary outline-none"
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={isLoading || !url}
            className={cn(
              'h-10 w-10 border border-input-border-default border-l-0 transition-all flex items-center justify-center',
              isLoading || !url
                ? 'bg-gray-500/20 text-gray-400 cursor-not-allowed'
                : 'bg-gray-500/10 text-gray-300 hover:bg-primary/20 hover:text-primary',
            )}
            title="Send Request"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Panel */}
        <div className="flex flex-col overflow-hidden" style={{ width: `${responseHeight}%` }}>
          <div className="border-b border-divider/50 shrink-0 bg-table-headerBg">
            <div className="grid grid-cols-3 h-full">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;
                // Map tab to accent color
                const accentMap: Record<string, string> = {
                  params: 'var(--info)',
                  headers: 'var(--accent-green)',
                  body: 'var(--error)',
                };
                const accentColor = accentMap[tab.id] || 'var(--primary)';
                const bgActive = isActive ? 'var(--table-body-bg)' : 'transparent';
                const colorActive = isActive ? accentColor : `${accentColor}80`;
                const borderActive = isActive
                  ? `2px solid ${accentColor}`
                  : '2px solid transparent';

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'py-2 text-xs font-medium transition-all text-center flex items-center justify-center gap-2 cursor-pointer border-none',
                      isActive
                        ? 'bg-table-bodyBg'
                        : 'hover:text-text-primary hover:bg-sidebar-item-hover',
                    )}
                    style={{
                      background: bgActive,
                      color: colorActive,
                      borderBottom: borderActive,
                    }}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 overflow-auto min-h-0">{renderEditor()}</div>
        </div>

        {/* Resize Handle */}
        <div
          className="w-1 cursor-col-resize hover:bg-primary/50 transition-colors shrink-0 bg-border/30"
          onMouseDown={handleMouseDown}
        />

        {/* Right Panel */}
        <div
          className="flex flex-col overflow-hidden border-l border-divider"
          style={{ width: `${100 - responseHeight}%` }}
        >
          {/* Response Header */}
          <div className="px-3 py-2 bg-table-headerBg border-b border-divider/50 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setResponseTab('body')}
                className={cn(
                  'px-2 py-1 text-xs font-medium transition-all rounded',
                  responseTab === 'body'
                    ? 'bg-primary/20 text-primary'
                    : 'text-text-secondary hover:text-text-primary',
                )}
              >
                Body
              </button>
              <button
                onClick={() => setResponseTab('headers')}
                className={cn(
                  'px-2 py-1 text-xs font-medium transition-all rounded',
                  responseTab === 'headers'
                    ? 'bg-primary/20 text-primary'
                    : 'text-text-secondary hover:text-text-primary',
                )}
              >
                Headers
              </button>
              {/* History Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowHistoryDropdown(!showHistoryDropdown)}
                  className="p-1.5 rounded-lg text-text-secondary hover:text-primary hover:bg-primary/10 transition-all"
                  title="Request History"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M16 14v2.2l1.6 1" />
                    <path d="M7 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2" />
                    <circle cx="16" cy="16" r="6" />
                  </svg>
                </button>
                {showHistoryDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowHistoryDropdown(false)}
                    />
                    <div className="absolute top-full left-0 mt-1 z-50 w-80 bg-dialog-background border border-divider rounded-md shadow-lg overflow-hidden">
                      <div className="p-2 border-b border-divider">
                        <input
                          type="text"
                          placeholder="Search history..."
                          value={historySearch}
                          onChange={(e) => setHistorySearch(e.target.value)}
                          className="w-full px-2 py-1 text-xs bg-table-header-background border border-input-border-default rounded outline-none focus:border-primary"
                        />
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        {filteredHistory.length === 0 ? (
                          <div className="p-4 text-center text-xs text-text-secondary">
                            No history
                          </div>
                        ) : (
                          filteredHistory.map((item) => (
                            <button
                              key={item.id}
                              onClick={() => {
                                setUrl(item.url);
                                setMethod(item.method as any);
                                setResponse(item.response);
                                setShowHistoryDropdown(false);
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-sidebar-itemHover transition-colors border-b border-divider/50 last:border-0 flex items-center justify-between"
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <MethodBadge method={item.method} size="sm" />
                                  <span
                                    className={cn(
                                      'text-[10px] font-mono',
                                      item.status >= 200 && item.status < 300 && 'text-success',
                                      item.status >= 400 && 'text-error',
                                    )}
                                  >
                                    {item.status}
                                  </span>
                                </div>
                                <div className="text-xs font-mono truncate max-w-[200px] text-text-secondary mt-0.5">
                                  {item.url}
                                </div>
                                <div className="text-[10px] text-text-tertiary mt-0.5">
                                  {new Date(item.timestamp).toLocaleTimeString()}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-[10px] text-text-secondary">{item.time}ms</div>
                                <div className="text-[10px] text-text-secondary">{item.size} B</div>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {response && !response.error && (
                <>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'text-[10px] font-bold px-1.5 py-0.5 rounded',
                        response.status >= 200 &&
                          response.status < 300 &&
                          'bg-green-500/10 text-green-500',
                        response.status >= 400 && 'bg-red-500/10 text-red-500',
                      )}
                    >
                      {response.status} {response.statusText}
                    </span>
                    <span className="text-[10px] text-text-secondary">{response.time}ms</span>
                    <span className="text-[10px] text-text-secondary">{response.size} B</span>
                  </div>
                  <button
                    onClick={handleSaveResponse}
                    disabled={isResponseSaved}
                    className={cn(
                      'p-1.5 rounded-lg transition-all',
                      isResponseSaved
                        ? 'bg-green-500/20 text-green-500 cursor-not-allowed'
                        : 'text-text-secondary hover:text-primary hover:bg-primary/10',
                    )}
                    title={isResponseSaved ? 'Response saved' : 'Save Response'}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M10 2v3a1 1 0 0 0 1 1h5" />
                      <path d="M18 18v-6a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6" />
                      <path d="M18 22H4a2 2 0 0 1-2-2V6" />
                      <path d="M8 18a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9.172a2 2 0 0 1 1.414.586l2.828 2.828A2 2 0 0 1 22 6.828V16a2 2 0 0 1-2.01 2z" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Response Content */}
          <div className="flex-1 overflow-hidden">
            {!response ? (
              <div className="h-full flex items-center justify-center text-text-secondary">
                <div className="text-center">
                  <Send className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p className="text-xs">Enter URL and click Send to see response</p>
                </div>
              </div>
            ) : response.error ? (
              <div className="p-4 text-red-500 text-xs flex items-center gap-2 h-full">
                <X className="w-4 h-4" />
                Error: {response.error}
              </div>
            ) : (
              <div className="h-full overflow-auto">
                {responseTab === 'body' && (
                  <CodeBlock
                    ref={responseBlockRef}
                    code={response.body}
                    language="json"
                    themeConfig={{ background: '#00000000' }}
                    onEditorMounted={() => {
                      setIsResponseEditorReady(true);
                    }}
                    editorOptions={{ readOnly: true }}
                    className="h-full"
                  />
                )}
                {responseTab === 'headers' && (
                  <KeyValueTable
                    items={Object.entries(response.headers || {}).map(([key, value]) => ({
                      key,
                      value: String(value),
                      enabled: true,
                    }))}
                    onChange={() => {}}
                    readOnly={true}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save to Collection Drawer */}
      {isDrawerOpen && (
        <>
          <div
            className="absolute inset-0 bg-black/40 z-40"
            onClick={() => setIsDrawerOpen(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 z-50 bg-dialog-background border-t border-divider rounded-t-2xl shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-300 h-[50%]">
            <div className="px-4 pt-4 pb-3 border-b border-divider flex items-center gap-3 shrink-0">
              <div className="flex items-center justify-center w-9 h-10 rounded-lg bg-info/15 border border-info/25 shrink-0">
                <Send className="w-4 h-4 text-info" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-text-primary">Save to Collection</h3>
                <p className="text-xs text-text-secondary mt-0.5">Name and describe this request</p>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 rounded-lg bg-sidebar-item-hover text-text-secondary hover:text-error hover:bg-error/10 transition-all shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1.5">
                  REQUEST NAME
                </label>
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  placeholder="e.g. Login API, Get User Info..."
                  className="w-full bg-table-header-background border border-input-border-default rounded-lg px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1.5">
                  DESCRIPTION (OPTIONAL)
                </label>
                <textarea
                  value={tempDesc}
                  onChange={(e) => setTempDesc(e.target.value)}
                  placeholder="Add a description for this request..."
                  rows={3}
                  className="w-full bg-table-headerBg border border-input-border-default rounded-lg px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary resize-none"
                />
              </div>
            </div>

            <div className="px-5 py-4 border-t border-divider flex justify-end gap-3 shrink-0">
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-sidebar-item-hover transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSave}
                disabled={!tempName.trim()}
                className="px-5 py-2 rounded-lg text-sm font-bold text-white bg-primary hover:bg-primary/90 disabled:opacity-50 transition-all"
              >
                Save to Collection
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
