import React, { useState, useRef, useEffect } from 'react';
import { NetworkRequest } from '../../../../types/inspector';
import { cn } from '../../../../shared/lib/utils';
import {
  List,
  Box,
  Globe,
  Copy,
  Flower2,
  Filter,
  ScanEye,
  KeyRound,
  Send,
  ShieldAlert,
  Cookie,
} from 'lucide-react';

import { HeadersDetails } from './Headers';
import { BodyDetails, BodyDetailsRef } from './Body';
import { NetworkDetails as NetworkDetailsSub } from './Network';
import { SecurityDetails } from './Security';
import { InspectorFilter, NetworkFilter } from './Filter';
import { CodeBlock } from '../../../../components/common/CodeBlock';
import { Composer } from './Composer';
import { CookieDetails } from './Cookie';
import { useI18n } from '../../../../i18n/i18nContext';
import { ResizableSplit } from '../common/ResizableSplit';

function Badge({ count, className }: { count: number; className?: string }) {
  if (count === 0) return null;
  return (
    <span
      className={cn(
        'ml-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] font-medium',
        className || 'bg-primary/20 text-primary',
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

interface NetworkDetailsProps {
  request: NetworkRequest | null;
  searchTerm: string;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onToggleFilter?: () => void;
  isFilterOpen?: boolean;
  filter: InspectorFilter;
  onFilterChange: (filter: InspectorFilter) => void;
  requests?: NetworkRequest[];
  onSearchTermChange?: (term: string) => void;
  onSelectRequest?: (id: string) => void;
  onJumpToValue?: (requestId: string, tab: string, value: string) => void;
  onCompareRequests?: (req1: NetworkRequest, req2: NetworkRequest, value?: string) => void;
  onSetCompare1?: (req: NetworkRequest) => void;
  onSetCompare2?: (req: NetworkRequest) => void;
  appId?: string;
  initialComposerRequest?: NetworkRequest | null;
  showComposerTab?: boolean;
}

function TextSelectionMenu({
  x,
  y,
  onAddToCrypto,
  onUseInSearch,
  onClose,
}: {
  x: number;
  y: number;
  selectedText: string;
  onAddToCrypto: () => void;
  onUseInSearch: () => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  useEffect(() => {
    const handleClickOutside = () => onClose();
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return (
    <div
      className="fixed z-50 bg-dialog-background border border-divider rounded-md shadow-lg py-1 min-w-[160px]"
      style={{
        left: `${x}px`,
        top: `${y}px`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={() => {
          onAddToCrypto();
          onClose();
        }}
className="w-full px-3 py-1.5 text-xs text-left hover:bg-error/10 hover:text-error transition-colors"
      >
        <KeyRound className="w-3 h-3" />
        {t.requestDetails.addToCrypto}
      </button>
      <button
        onClick={() => {
          onUseInSearch();
          onClose();
        }}
        className="w-full px-3 py-1.5 text-xs text-left hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-2"
      >
        <Filter className="w-3 h-3" />
        {t.requestDetails.useInSearch}
      </button>
    </div>
  );
}

export function RequestDetails({
  request,
  searchTerm,
  activeTab: propsActiveTab,
  onTabChange,
  onToggleFilter,
  isFilterOpen,
  filter,
  onFilterChange,
  requests = [],
  onSearchTermChange,
  onJumpToValue: _onJumpToValue,
  onCompareRequests: _onCompareRequests,
  appId,
  initialComposerRequest,
  showComposerTab = false,
}: NetworkDetailsProps) {
  const [internalActiveTab, setInternalActiveTab] = useState('headers');
  const [isRawMode, setIsRawMode] = useState(false);
  const { t } = useI18n();

  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    selectedText: string;
  }>({
    visible: false,
    x: 0,
    y: 0,
    selectedText: '',
  });

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bodyDetailsRef = useRef<BodyDetailsRef>(null);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);

  const activeTab = propsActiveTab || internalActiveTab;

  useEffect(() => {
    setCurrentMatchIndex(-1);
  }, [activeTab, searchTerm]);

  useEffect(() => {
    setContextMenu({ visible: false, x: 0, y: 0, selectedText: '' });
  }, [activeTab, request]);

  const setActiveTab = (tab: string) => {
    setIsRawMode(false);
    if (tab === 'trace' && isFilterOpen && onToggleFilter) {
      onToggleFilter();
    }
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalActiveTab(tab);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim() || '';

    if (selectedText) {
      setContextMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        selectedText,
      });
    }
  };

  const handleAddToCrypto = () => {
    window.dispatchEvent(
      new CustomEvent('add-to-crypto', {
        detail: { text: contextMenu.selectedText },
      }),
    );
  };

  const handleUseInSearch = () => {
    if (onSearchTermChange) {
      onSearchTermChange(contextMenu.selectedText);
    }
  };

  const handleCloseContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0, selectedText: '' });
  };

  const getTabContent = (tabId: string) => {
    if (!request) return null;

    switch (tabId) {
      case 'headers':
        return {
          request: request.requestHeaders,
          response: request.responseHeaders,
        };
      case 'body':
        return {
          request: request.requestBody,
          response: request.responseBody,
        };
      case 'network':
        return {
          timing: request.timing,
          serverIPAddress: request.serverIPAddress,
          connection: request.connection,
        };
      default:
        return request;
    }
  };

  const handleCopy = () => {
    const content = getTabContent(activeTab);
    if (content) {
      navigator.clipboard.writeText(JSON.stringify(content, null, 2));
    }
  };

  const getMatchCount = (data: unknown): number => {
    if (!searchTerm) return 0;
    let regex: RegExp;
    try {
      regex = new RegExp(searchTerm, 'i');
    } catch {
      regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    }

    let count = 0;
    const check = (val: unknown) => {
      if (val == null) return;
      if (typeof val === 'object') {
        Object.values(val).forEach(check);
        Object.keys(val).forEach((k) => {
          if (regex.test(k)) count++;
        });
      } else if (Array.isArray(val)) {
        val.forEach(check);
      } else {
        if (regex.test(String(val))) count++;
      }
    };

    check(data);
    return count;
  };

  const getBodyMatchCount = (body?: string) => {
    if (!body || !searchTerm) return 0;
    let regex: RegExp;
    try {
      regex = new RegExp(searchTerm, 'gi');
    } catch {
      regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    }
    const matches = body.match(regex);
    return matches ? matches.length : 0;
  };

  const matches = {
    headers: request
      ? getMatchCount(request.requestHeaders) + getMatchCount(request.responseHeaders)
      : 0,
    body: 0,
    network: 0,
  };

  if (request && request.analysis) {
    const analysis = request.analysis;
    const reqBody = analysis?.body?.request?.formatted
      ? JSON.stringify(analysis.body.request.formatted, null, 2)
      : analysis?.body?.request?.raw || '';

    const resBody = analysis?.body?.response?.formatted
      ? JSON.stringify(analysis.body.response.formatted, null, 2)
      : analysis?.body?.response?.raw || '';

    matches.body = getBodyMatchCount(reqBody) + getBodyMatchCount(resBody);
  } else if (request) {
    matches.body = getBodyMatchCount(request.requestBody) + getBodyMatchCount(request.responseBody);
  }

  // Define accent colors as CSS variables for dynamic usage
  const tabAccents = {
    headers: { color: 'var(--info)', border: 'var(--info)' },
    body: { color: 'var(--error)', border: 'var(--error)' },
    network: { color: 'var(--accent-cyan)', border: 'var(--accent-cyan)' },
    composer: { color: 'var(--info)', border: 'var(--info)' },
    security: { color: 'var(--error)', border: 'var(--error)' },
    cookies: { color: 'var(--warning)', border: 'var(--warning)' },
  };

  const tabs = [
    {
      id: 'headers',
      label: t.requestDetails.headers,
      icon: List,
      count: matches.headers,
      importantCount: 0,
      accentKey: 'headers' as const,
    },
    {
      id: 'body',
      label: t.requestDetails.body,
      icon: Box,
      count: matches.body,
      importantCount: 0,
      accentKey: 'body' as const,
    },
    {
      id: 'network',
      label: t.requestDetails.network,
      icon: Globe,
      count: matches.network,
      importantCount: 0,
      accentKey: 'network' as const,
    },
    ...(showComposerTab
      ? [
          {
            id: 'composer',
            label: t.requestDetails.composer,
            icon: Send,
            count: 0,
            importantCount: 0,
            accentKey: 'composer' as const,
          },
        ]
      : []),
    ...(request?.protocol === 'https' && (request?.securityIssues?.length ?? 0) > 0
      ? [
          {
            id: 'security',
            label: t.requestDetails.security,
            icon: ShieldAlert,
            count: request.securityIssues!.length,
            importantCount: 0,
            accentKey: 'security' as const,
          },
        ]
      : []),
    ...(request?.protocol === 'https' &&
    ((request?.requestCookies && Object.keys(request.requestCookies).length > 0) ||
      (request?.responseCookies && Object.keys(request.responseCookies).length > 0) ||
      (request?.requestHeaders &&
        Object.keys(request.requestHeaders).some((k) => k.toLowerCase() === 'cookie')) ||
      (request?.responseHeaders &&
        Object.keys(request.responseHeaders).some((k) => k.toLowerCase() === 'set-cookie')))
      ? [
          {
            id: 'cookies',
            label: t.requestDetails.cookies,
            icon: Cookie,
            count: 0,
            importantCount: 0,
            accentKey: 'cookies' as const,
          },
        ]
      : []),
  ] as const;

  const scrollToNextMatch = () => {
    if (activeTab === 'body') {
      bodyDetailsRef.current?.nextMatch();
      return;
    }

    if (!scrollContainerRef.current) return;

    const marks = scrollContainerRef.current.querySelectorAll('mark');
    if (marks.length === 0) return;

    let nextIndex = currentMatchIndex + 1;
    if (nextIndex >= marks.length) {
      nextIndex = 0;
    }

    const targetMark = marks[nextIndex];
    targetMark.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });

    setCurrentMatchIndex(nextIndex);
  };

  const isComposerTab = activeTab === 'composer';
  const isSecurityTab = activeTab === 'security';
  const isCookieTab = activeTab === 'cookies';

  const content = (
    <div className="flex-1 overflow-hidden h-full" onContextMenu={handleContextMenu}>
      {!request && !isComposerTab ? (
        <div className="h-full flex items-center justify-center text-text-secondary bg-table-bodyBg">
          {t.requestDetails.selectRequest}
        </div>
      ) : isComposerTab ? (
        <div className="h-full w-full">
          <Composer appId={appId || 'unknown'} initialRequest={initialComposerRequest} />
        </div>
      ) : isSecurityTab && request ? (
        <div className="flex-1 overflow-auto h-full">
          <SecurityDetails
            request={request}
            onJumpToEvidence={(tab, term) => {
              setActiveTab(tab);
              if (onSearchTermChange) onSearchTermChange(term);
            }}
          />
        </div>
      ) : isCookieTab && request ? (
        <div className="flex-1 overflow-auto h-full">
          <CookieDetails request={request} />
        </div>
      ) : isRawMode ? (
        <CodeBlock
          code={JSON.stringify(getTabContent(activeTab), null, 2)}
          language="json"
          themeConfig={{ background: '#00000000' }}
        />
      ) : (
        <div ref={scrollContainerRef} className="flex-1 overflow-auto h-full p-2 font-mono text-xs">
          {activeTab === 'headers' && request && (
            <HeadersDetails request={request} searchTerm={searchTerm} />
          )}
          {activeTab === 'body' && request && (
            <BodyDetails ref={bodyDetailsRef} request={request} searchTerm={searchTerm} />
          )}
          {activeTab === 'network' && request && <NetworkDetailsSub request={request} />}
          {activeTab === 'security' && request && <SecurityDetails request={request} />}
        </div>
      )}
    </div>
  );

  const currentTabHasMatches =
    searchTerm &&
    !isRawMode &&
    !isComposerTab &&
    !isSecurityTab &&
    !isCookieTab &&
    (matches[activeTab as keyof typeof matches] || 0) > 0;

  return (
    <div className="h-full">
      <div className="h-full flex flex-col border-t border-divider/50">
        <div className="flex h-10 items-center border-b border-divider/50 bg-table-headerBg">
          <div className="flex-1 overflow-x-auto no-scrollbar flex items-center h-full">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const accent = tabAccents[tab.accentKey];
              const accentColor = accent?.color || 'var(--primary)';
              const borderColor = accent?.border || 'var(--primary)';

              if (isActive) {
                return (
                  <div
                    key={tab.id}
                    style={{
                      display: 'flex',
                      height: '100%',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '0 12px',
                      fontSize: '13px',
                      fontWeight: 600,
                      borderBottom: `2px solid ${borderColor}`,
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s',
                      background: 'var(--table-body-bg)',
                      color: accentColor,
                    }}
                  >
                    <Icon style={{ width: 14, height: 14 }} />
                    {tab.label}
                    <Badge count={tab.count} className={undefined} />

                    {tab.id !== 'composer' && tab.id !== 'security' && tab.id !== 'cookies' && (
                      <div
                        style={{
                          marginLeft: 8,
                          paddingLeft: 8,
                          borderLeft: '1px solid currentColor',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          opacity: 0.7,
                        }}
                      >
                        {currentTabHasMatches && (
                          <button
                            onClick={scrollToNextMatch}
                            style={{
                              padding: 2,
                              borderRadius: 4,
                              background: 'transparent',
                              color: 'var(--text-secondary)',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = accentColor;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = 'var(--text-secondary)';
                            }}
                            title={t.requestDetails.nextMatch}
                          >
                            <ScanEye style={{ width: 14, height: 14 }} />
                          </button>
                        )}

                        <button
                          onClick={handleCopy}
                          style={{
                            padding: 2,
                            borderRadius: 4,
                            background: 'transparent',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = accentColor;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'var(--text-secondary)';
                          }}
                          title={t.requestDetails.copyTab}
                        >
                          <Copy style={{ width: 14, height: 14 }} />
                        </button>
                        <button
                          onClick={() => setIsRawMode(!isRawMode)}
                          style={{
                            padding: 2,
                            borderRadius: 4,
                            background: isRawMode ? `${accentColor}20` : 'transparent',
                            color: isRawMode ? accentColor : 'var(--text-secondary)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            if (!isRawMode) {
                              e.currentTarget.style.color = accentColor;
                              e.currentTarget.style.background = `${accentColor}10`;
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isRawMode) {
                              e.currentTarget.style.color = 'var(--text-secondary)';
                              e.currentTarget.style.background = 'transparent';
                            }
                          }}
                          title={t.requestDetails.toggleRaw}
                        >
                          <Flower2 style={{ width: 14, height: 14 }} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex',
                    height: '100%',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '0 12px',
                    fontSize: '13px',
                    fontWeight: 600,
                    borderBottom: '2px solid transparent',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s',
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--text-primary)';
                    e.currentTarget.style.background = 'var(--secondary)/40';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--text-secondary)';
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <Icon style={{ width: 14, height: 14 }} />
                  {tab.label}
                  <Badge count={tab.count} />
                </button>
              );
            })}
          </div>
          {onToggleFilter && (
            <div className="flex h-full border-l border-divider/50">
              <button
                onClick={onToggleFilter}
                className={cn(
                  'flex h-full items-center gap-1.5 px-3 text-sm font-semibold border-b-2 border-transparent transition-colors hover:text-text-primary hover:bg-secondary/40 whitespace-nowrap',
                  isFilterOpen
                    ? 'border-primary text-primary bg-table-bodyBg'
                    : 'text-text-secondary',
                )}
                title={
                  isFilterOpen ? t.requestDetails.collapseFilters : t.requestDetails.expandFilters
                }
              >
                <Filter className="w-3.5 h-3.5" />
                {t.requestDetails.filter}
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-hidden relative">
          {isFilterOpen &&
          activeTab !== 'composer' &&
          activeTab !== 'security' &&
          activeTab !== 'cookies' ? (
            <ResizableSplit direction="horizontal" initialSize={70} minSize={30} maxSize={80}>
              {content}
              <NetworkFilter filter={filter} onChange={onFilterChange} requests={requests} />
            </ResizableSplit>
          ) : (
            content
          )}
        </div>
      </div>

      {contextMenu.visible && (
        <TextSelectionMenu
          x={contextMenu.x}
          y={contextMenu.y}
          selectedText={contextMenu.selectedText}
          onAddToCrypto={handleAddToCrypto}
          onUseInSearch={handleUseInSearch}
          onClose={handleCloseContextMenu}
        />
      )}
    </div>
  );
}

// Export all components
export { BodyDetails } from './Body';
export { Composer } from './Composer';
export { HeadersDetails } from './Headers';
export { CookieDetails } from './Cookie';
export { NetworkFilter, initialFilterState } from './Filter';
export type { InspectorFilter, NetworkRequest as FilterNetworkRequest } from './Filter';
export { NetworkDetails } from './Network';
export { SecurityDetails } from './Security';
export { RequestTable } from './RequestTable';

// RequestList wrapper component (re-export for compatibility)
import { RequestTable as RequestTableComponent } from './RequestTable';
import { initialFilterState as filterInitialState } from './Filter';
import type { WebSocketConnection } from '../../../../types/inspector';

interface RequestListProps {
  filteredRequests: NetworkRequest[];
  requests: NetworkRequest[];
  selectedId: string | null;
  onSelectRequest: (id: string | null) => void;
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  interceptedIds: Set<string>;
  pendingActionIds: Set<string>;
  onForward: (id: string) => void;
  onDrop: (id: string) => void;
  onDeleteRequest: (id: string) => void;
  appId: string;
  onSetCompare1: (req: NetworkRequest | null) => void;
  onSetCompare2: (req: NetworkRequest | null) => void;
  setFilter: (filter: InspectorFilter) => void;
  onAnalyzeRequest?: (req: NetworkRequest) => void;
  onSendToFuzzer?: (req: NetworkRequest) => void;
  onSelectionChange?: (selectedIds: string[]) => void;
  wsConnections: WebSocketConnection[];
  selectedWsId: string | null;
  onSelectWsConnection: (id: string | null) => void;
  onDeleteWsConnection: (id: string) => void;
  browserViewUrl: string | null;
}

export function RequestList({
  filteredRequests,
  requests,
  selectedId,
  onSelectRequest,
  searchTerm,
  onSearchTermChange,
  interceptedIds,
  pendingActionIds,
  onForward,
  onDrop,
  onDeleteRequest,
  appId,
  onSetCompare1,
  onSetCompare2,
  setFilter,
  onAnalyzeRequest,
  onSendToFuzzer,
  onSelectionChange,
  browserViewUrl,
}: RequestListProps) {
  const [view, setView] = useState<'table' | 'timeline' | 'websocket' | 'browser'>('table');
  const { t } = useI18n();

  useEffect(() => {
    if (browserViewUrl) {
      setView('browser');
    }
  }, [browserViewUrl]);

  return (
    <div className="h-full flex">
      <div className="flex-1 flex flex-col min-w-0">
        {view === 'table' && filteredRequests.length === 0 && requests.length > 0 && (
          <div className="p-4 bg-warning/10 text-warning text-xs text-center border-b border-warning/20 shrink-0">
            {t.requestList.allHidden.replace('{count}', String(requests.length))}
            <button
              onClick={() => setFilter({ ...filterInitialState })}
              className="ml-2 underline hover:text-warning"
            >
              {t.requestList.resetFilters}
            </button>
          </div>
        )}
        <RequestTableComponent
          requests={filteredRequests}
          selectedId={selectedId}
          onSelect={(id) => onSelectRequest(id)}
          searchTerm={searchTerm}
          onSearchChange={onSearchTermChange}
          interceptedIds={interceptedIds}
          pendingActionIds={pendingActionIds}
          onForward={onForward}
          onDrop={onDrop}
          onDelete={onDeleteRequest}
          appId={appId || 'unknown'}
          onSetCompare1={onSetCompare1}
          onSetCompare2={onSetCompare2}
          onAnalyzeRequest={onAnalyzeRequest}
          onSendToFuzzer={onSendToFuzzer}
          onSelectionChange={onSelectionChange}
        />
      </div>
    </div>
  );
}