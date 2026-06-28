import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  getFilteredRowModel,
  SortingState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { cn } from '../../../../shared/lib/utils';
import {
  ArrowLeft,
  ArrowLeftRight,
  ArrowUpDown,
  BookmarkPlus,
  Box,
  Check,
  ChevronRight,
  Cookie,
  Copy,
  Globe,
  List,
  Play,
  Pause,
  ShieldAlert,
  Star,
  Target,
  Trash2,
  Zap,
  CaseSensitive,
  Type,
  Regex,
  Shield,
  Monitor,
  CircleDashed,
} from 'lucide-react';
import { useDebounce } from 'use-debounce';

import { useAccentColors } from '../../../../shared/hooks/useAccentColors';

import { NetworkRequest } from './Filter';

import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
} from '../../../../components/ui/Dropdown';

interface RequestTableProps {
  requests: NetworkRequest[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  interceptedIds?: Set<string>;
  pendingActionIds?: Set<string>;
  onForward?: (id: string) => void;
  onDrop?: (id: string) => void;
  onDelete?: (id: string) => void;
  appId: string;
  onSetCompare1: (req: NetworkRequest) => void;
  onSetCompare2: (req: NetworkRequest) => void;
  onAnalyzeRequest?: (req: NetworkRequest) => void;
  onSendToRepeater?: (req: NetworkRequest) => void;
  onSelectionChange?: (selectedIds: string[]) => void;
  onLaunchTarget?: (
    appId: string,
    proxyUrl: string,
    customUrl?: string,
    mode?: 'browser' | 'electron' | 'native' | 'cdp',
  ) => Promise<void>;
  onClearRequests?: () => void;
  currentTargetAppId?: string;
  currentTargetUrl?: string;
  // Target state from parent
  isTargetActive: boolean;
  activeTargetMode: 'mitm' | 'cdp' | null;
  isInterceptActive: boolean;
  onToggleIntercept: () => void;
  onStopTarget: () => void;
  onStartTarget: (mode: 'mitm' | 'cdp') => void;
}

export function RequestTable({
  requests,
  selectedId,
  onSelect,
  searchTerm,
  onSearchChange,
  interceptedIds,
  pendingActionIds,
  onForward,
  onDrop,
  onDelete,
  appId: _appId,
  onSetCompare1,
  onSetCompare2,
  onAnalyzeRequest,
  onSendToRepeater,
  onSelectionChange,
  onLaunchTarget,
  onClearRequests,
  currentTargetAppId,
  currentTargetUrl,
  isTargetActive: propsIsTargetActive,
  activeTargetMode: propsActiveTargetMode,
  isInterceptActive: propsIsInterceptActive,
  onToggleIntercept,
  onStopTarget,
  onStartTarget,
}: RequestTableProps) {
  // Use props as source of truth for UI state (more reliable than store)
  // Store is only used for persistence, not for real-time UI updates
  const isTargetActive = propsIsTargetActive;
  const activeTargetMode = propsActiveTargetMode;

  const { getColorByIndex, toRgba } = useAccentColors();

  const [sorting, setSorting] = useState<SortingState>([]);
  const [matchCase, setMatchCase] = useState(false);
  const [matchWholeWord, setMatchWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [isTargetDropdownOpen, setIsTargetDropdownOpen] = useState(false);
  const targetDropdownRef = useRef<HTMLDivElement>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [rowSelection, setRowSelection] = useState({});
  

  // Feature: Highlighted Rows
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());

  // Feature: Right-click context menu on rows
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    request: NetworkRequest;
  } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    if (contextMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
    return undefined;
  }, [contextMenu]);

  // Close context menu on scroll
  useEffect(() => {
    const container = tableContainerRef.current;
    if (!container || !contextMenu) return;
    const handleScroll = () => setContextMenu(null);
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [contextMenu]);
  const toggleHighlight = useCallback((id: string) => {
    setHighlightedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const formatRequestToMarkdown = (req: NetworkRequest): string => {
    let output = `### \`${req.method}\` ${req.url}\n\n`;

    output += '**Headers:**\n';
    output += '```http\n';
    if (req.requestHeaders && Object.keys(req.requestHeaders).length > 0) {
      output += Object.entries(req.requestHeaders)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n');
    } else {
      output += '(No headers)';
    }
    output += '\n```\n\n';

    output += '**Body:**\n';
    if (req.requestBody) {
      const bodyStr = typeof req.requestBody === 'string' ? req.requestBody : '';
      const trimmed = bodyStr.trim();
      if (
        (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))
      ) {
        try {
          const parsed = JSON.parse(trimmed);
          output += '```json\n' + JSON.stringify(parsed, null, 2) + '\n```';
        } catch {
          output += '```\n' + bodyStr + '\n```';
        }
      } else {
        output += '```\n' + bodyStr + '\n```';
      }
    } else {
      output += '*(No body)*';
    }

    return output;
  };

  const formatRequestToJson = (req: NetworkRequest): string => {
    const entry: any = {
      method: req.method,
      host: req.host,
      path: req.path,
      protocol: req.protocol,
      url: req.url,
      status: req.status,
      type: req.type,
    };
    if (req.requestHeaders && Object.keys(req.requestHeaders).length > 0) {
      entry.requestHeaders = req.requestHeaders;
    }
    if (req.requestBody) {
      entry.requestBody = req.requestBody;
    }
    return JSON.stringify(entry, null, 2);
  };

  const handleCopySingleAsMarkdown = (req: NetworkRequest) => {
    navigator.clipboard.writeText(formatRequestToMarkdown(req));
  };

  const handleCopySingleAsJson = (req: NetworkRequest) => {
    navigator.clipboard.writeText(formatRequestToJson(req));
  };

  // Copy Selected with section options
  const [copySections, setCopySections] = useState({
    status: true,
    headers: true,
    body: true,
    security: true,
  });
  const [copyFormat, setCopyFormat] = useState<'json' | 'markdown'>('json');

  const toggleCopySection = (section: keyof typeof copySections) => {
    setCopySections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const formatSelectedWithOptions = (): string => {
    const selectedRows = table.getSelectedRowModel().rows;
    if (selectedRows.length === 0) return '';

    const selectedRequests = selectedRows.map((row) => row.original);

    if (copyFormat === 'json') {
      const data = selectedRequests.map((req) => {
        const entry: any = {};
        if (copySections.status) {
          entry.status = req.status;
          entry.type = req.type;
          entry.host = req.host;
          entry.path = req.path;
          entry.method = req.method;
          entry.protocol = req.protocol;
        }
        if (copySections.headers) {
          entry.requestHeaders = req.requestHeaders;
          entry.responseHeaders = req.responseHeaders;
        }
        if (copySections.body) {
          entry.requestBody = req.requestBody || '';
          entry.responseBody = req.responseBody || '';
        }
        if (copySections.security) {
          entry.securityIssues = req.securityIssues || [];
        }
        return entry;
      });
      return JSON.stringify(data, null, 2);
    }

    // Markdown format
    return selectedRequests
      .map((req) => {
        let md = '';
        if (copySections.status) {
          md += `### \`${req.method}\` ${req.protocol}://${req.host}${req.path}\n\n`;
          md += `| Status | Type |\n|--------|------|\n| ${req.status} | ${req.type} |\n\n`;
        }
        if (copySections.headers) {
          md += '**Request Headers:**\n```http\n';
          md +=
            req.requestHeaders && Object.keys(req.requestHeaders).length > 0
              ? Object.entries(req.requestHeaders)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join('\n')
              : '(No headers)';
          md += '\n```\n\n';
          md += '**Response Headers:**\n```http\n';
          md +=
            req.responseHeaders && Object.keys(req.responseHeaders).length > 0
              ? Object.entries(req.responseHeaders)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join('\n')
              : '(No headers)';
          md += '\n```\n\n';
        }
        if (copySections.body) {
          md += '**Request Body:**\n```\n';
          md += req.requestBody || '(No body)';
          md += '\n```\n\n';
          md += '**Response Body:**\n```\n';
          if (req.responseBody) {
            const bodyStr = typeof req.responseBody === 'string' ? req.responseBody : '';
            const trimmed = bodyStr.trim();
            if (
              (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
              (trimmed.startsWith('[') && trimmed.endsWith(']'))
            ) {
              try {
                md += JSON.stringify(JSON.parse(trimmed), null, 2);
              } catch {
                md += bodyStr;
              }
            } else {
              md += bodyStr;
            }
          } else {
            md += '(No body)';
          }
          md += '\n```\n\n';
        }
        if (copySections.security) {
          md += '**Security Issues:**\n';
          const issues = req.securityIssues || [];
          if (issues.length > 0) {
            issues.forEach((issue) => {
              md += `- **${issue.severity?.toUpperCase() || 'UNKNOWN'}**: ${issue.title || 'No title'} - ${issue.description || 'No description'}\n`;
            });
          } else {
            md += '*(No security issues)*\n';
          }
          md += '\n';
        }
        return md;
      })
      .join('\n---\n\n');
  };

  const handleCopySelectedWithOptions = () => {
    const text = formatSelectedWithOptions();
    if (text) {
      navigator.clipboard.writeText(text);
    }
  };

  // Debounce search term to reduce re-renders
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);

  const columns = useMemo<ColumnDef<NetworkRequest>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <button
            onClick={() => table.toggleAllRowsSelected(!table.getIsAllRowsSelected())}
            className={cn(
              'w-3.5 h-3.5 rounded border flex items-center justify-center transition-all cursor-pointer select-none',
              table.getIsAllRowsSelected()
                ? 'bg-primary border-primary text-zinc-950 shadow-sm shadow-primary/20'
                : 'border-border bg-card-background/50 hover:border-border-hover text-transparent',
            )}
          >
            <Check className="w-2.5 h-2.5 stroke-[3.5]" />
          </button>
        ),
        cell: ({ row }) => (
          <button
            onClick={(e) => {
              e.stopPropagation();
              row.toggleSelected(!row.getIsSelected());
            }}
            className={cn(
              'w-3.5 h-3.5 rounded border flex items-center justify-center transition-all cursor-pointer select-none',
              row.getIsSelected()
                ? 'bg-primary border-primary text-zinc-950 shadow-sm shadow-primary/20'
                : 'border-border bg-card-background/50 hover:border-border-hover text-transparent',
            )}
          >
            <Check className="w-2.5 h-2.5 stroke-[3.5]" />
          </button>
        ),
        size: 35,
      },
      {
        accessorKey: 'id',
        header: ({ column }) => {
          return (
            <button
              className="flex items-center gap-1 hover:text-foreground"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
              #
              <ArrowUpDown className="h-3 w-3" />
            </button>
          );
        },
        cell: ({ row }) => <span className="text-text-primary">{row.getValue('id')}</span>,
        // Hiding detailed ID column to save space, but keeping it in data model
        size: 0,
        enableHiding: true,
      },
{
        accessorKey: 'method',
        header: 'Method',
        size: 100,
        cell: ({ row }) => {
          const method = row.getValue('method') as string;
          const methodColorMap: Record<string, string> = {
            GET: 'text-blue',
            POST: 'text-green',
            PUT: 'text-yellow',
            DELETE: 'text-red',
            PATCH: 'text-purple',
            HEAD: 'text-pink',
            OPTIONS: 'text-teal',
            TRACE: 'text-navy',
            CONNECT: 'text-violet',
          };
          const colorClass = methodColorMap[method] || 'text-text-primary';
          return <span className={cn('font-bold text-xs', colorClass)}>{method}</span>;
        },
      },
      {
        accessorKey: 'host',
        header: 'Host',
        size: 200,
        cell: ({ row }) => (
          <span className="truncate block w-full text-text-primary" title={row.getValue('host')}>
            {row.getValue('host')}
          </span>
        ),
      },
      {
        accessorKey: 'path',
        header: 'Path',
        size: 400,
        cell: ({ row }) => (
          <span className="truncate block w-full text-text-primary" title={row.getValue('path')}>
            {row.getValue('path')}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        id: 'status', // Explicitly set ID for the column
        size: 110,
        cell: ({ row }) => {
          const id = row.original.id;
          const isPending = pendingActionIds?.has(id);
          const status = row.getValue('status') as number;

          if (isPending) {
            return (
              <div
                className="flex items-center gap-1.5 text-text-primary"
                onClick={(e) => e.stopPropagation()}
              >
                <svg
                  className="w-3.5 h-3.5 text-warning animate-pulse shrink-0"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <rect x="6" y="5" width="4" height="14" rx="1" />
                  <rect x="14" y="5" width="4" height="14" rx="1" />
                </svg>
                <span className="text-warning font-bold animate-pulse text-xs tracking-wider">
                  Held
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onForward?.(id);
                  }}
                  className="px-2 py-0.5 bg-success/20 text-success hover:bg-success/30 rounded text-[10px] font-bold border border-success/40 transition-colors"
                  title="Forward Request to Server"
                >
                  ▶ Fwd
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDrop?.(id);
                  }}
                  className="px-2 py-0.5 bg-error/20 text-error hover:bg-error/30 rounded text-[10px] font-bold border border-error/40 transition-colors"
                  title="Drop Request"
                >
                  ✕ Drop
                </button>
              </div>
            );
          }

          let colorClass = 'text-text-primary';
          if (status >= 200 && status < 300) {
            colorClass = 'text-green';
          } else if (status >= 300 && status < 400) {
            colorClass = 'text-yellow';
          } else if (status >= 400) {
            colorClass = 'text-red';
          }
          return (
            <span
              className={cn('font-bold text-xs text-center w-full', colorClass)}
            >
              {status || 'Pending'}
            </span>
          );
        },
      },
      {
        accessorKey: 'type',
        header: 'Type',
        size: 80,
        cell: ({ row }) => {
          const type = row.getValue('type') as string;
          const formattedType = type ? type.charAt(0).toUpperCase() + type.slice(1) : type;
          const typeColorMap: Record<string, string> = {
            xhr: 'text-blue',
            js: 'text-yellow',
            css: 'text-purple',
            img: 'text-pink',
            media: 'text-teal',
            font: 'text-navy',
            doc: 'text-violet',
            ws: 'text-green',
            wasm: 'text-purple',
            manifest: 'text-yellow',
            other: 'text-text-secondary',
          };
          const colorClass = typeColorMap[type] || 'text-text-secondary';
          return (
            <span className={cn('text-xs font-medium', colorClass)}>
              {formattedType}
            </span>
          );
        },
      },
      {
        id: 'tags',
        header: 'Tags',
        size: 150,
        minSize: 100,
        cell: ({ row }) => {
          const req = row.original;
          const tags: {
            label: string;
            tooltip: string;
            colorClass: string;
            bgClass: string;
            borderClass: string;
            icon?: React.ReactNode;
          }[] = [];

          // Detect WASM
          const isWasm =
            (req.path && /\.wasm(\?|#|$)/i.test(req.path)) ||
            (req.type && req.type.toLowerCase() === 'wasm') ||
            (req.responseHeaders &&
              Object.entries(req.responseHeaders).some(
                ([k, v]) =>
                  k.toLowerCase() === 'content-type' &&
                  String(v).toLowerCase().includes('application/wasm'),
              ));

          if (isWasm) {
            tags.push({
              label: 'WASM',
              tooltip: 'WebAssembly',
              colorClass: 'text-purple',
              bgClass: 'bg-purple/15',
              borderClass: 'border-purple/30',
            });
          }

          // Detect SSE (Server-Sent Events)
          const isSse =
            req.responseHeaders &&
            Object.entries(req.responseHeaders).some(
              ([k, v]) =>
                k.toLowerCase() === 'content-type' &&
                String(v).toLowerCase().includes('text/event-stream'),
            );

          if (isSse) {
            tags.push({
              label: 'SSE',
              tooltip: 'Server-Sent Events',
              colorClass: 'text-teal',
              bgClass: 'bg-teal/15',
              borderClass: 'border-teal/30',
            });
          }

          // Detect Cookies
          const hasCookies =
            (req.requestCookies && Object.keys(req.requestCookies).length > 0) ||
            (req.responseCookies && Object.keys(req.responseCookies).length > 0) ||
            (req.requestHeaders &&
              Object.keys(req.requestHeaders).some((k) => k.toLowerCase() === 'cookie')) ||
            (req.responseHeaders &&
              Object.keys(req.responseHeaders).some((k) => k.toLowerCase() === 'set-cookie'));

          if (hasCookies) {
            tags.push({
              label: '',
              tooltip: 'Cookies',
              colorClass: 'text-yellow',
              bgClass: 'bg-yellow/15',
              borderClass: 'border-yellow/30',
              icon: <Cookie className="w-3 h-3" />,
            });
          }

          // Security issues — only show badge if there are high severity issues
          const secIssues = req.securityIssues || [];
          const highCount = secIssues.filter(
            (i: { severity: string }) => i.severity === 'high',
          ).length;
          if (highCount > 0) {
            tags.push({
              label: '⚠',
              tooltip: `${secIssues.length} security issue(s) detected (${highCount} high)`,
              colorClass: 'text-red',
              bgClass: 'bg-red/15',
              borderClass: 'border-red/30',
            });
          }

          if (tags.length === 0) return null;

          return (
            <div className="flex gap-1 flex-wrap">
              {tags.map((tag) => (
                <span
                  key={tag.label || tag.tooltip}
                  className={cn(
                    'px-1.5 py-0.5 rounded text-[10px] tracking-wide inline-flex items-center gap-1 font-bold border',
                    tag.colorClass,
                    tag.bgClass,
                    tag.borderClass,
                  )}
                  title={tag.tooltip}
                >
                  {tag.icon}
                  {tag.label ? <span>{tag.label}</span> : null}
                </span>
              ))}
            </div>
          );
        },
      },
      {
        accessorKey: 'size',
        header: 'Size',
        size: 95,
        cell: ({ row }) => <span className="text-text-primary">{row.getValue('size')}</span>,
      },
      {
        accessorKey: 'time',
        header: 'Time',
        size: 95,
        cell: ({ row }) => <span className="text-text-primary">{row.getValue('time')}</span>,
      },
    ],
    [pendingActionIds, onForward, onDrop, highlightedIds, toggleHighlight, getColorByIndex, toRgba],
  );

  // Memoized global filter function with pre-compiled regex
  const globalFilterFn = useCallback(
    (row: any, _columnId: string, filterValue: string) => {
      const searchTerm = String(filterValue);
      if (!searchTerm) return true;

      let regex: RegExp | null = null;

      // Build regex based on options
      if (useRegex) {
        try {
          const flags = matchCase ? 'g' : 'gi';
          regex = new RegExp(searchTerm, flags);
        } catch {
          // invalid regex, fallback to literal
          const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          regex = new RegExp(escaped, matchCase ? '' : 'i');
        }
      } else {
        // Literal search
        let pattern = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (matchWholeWord) {
          pattern = `\\b${pattern}\\b`;
        }
        regex = new RegExp(pattern, matchCase ? '' : 'i');
      }

      const match = (value: unknown): boolean => {
        if (value == null) return false;
        const str = String(value);
        if (regex) {
          return regex.test(str);
        }
        return matchCase
          ? str.includes(searchTerm)
          : str.toLowerCase().includes(searchTerm.toLowerCase());
      };

      const request = row.original;

      // Check top-level fields
      if (
        match(request.id) ||
        match(request.method) ||
        match(request.protocol) ||
        match(request.host) ||
        match(request.path) ||
        match(request.status) ||
        match(request.type) ||
        match(request.size) ||
        match(request.time)
      ) {
        return true;
      }

      // Check headers
      const checkHeaders = (headers: Record<string, string>) => {
        return Object.entries(headers).some(([k, v]) => match(k) || match(v));
      };

      if (checkHeaders(request.requestHeaders) || checkHeaders(request.responseHeaders)) {
        return true;
      }

      // Check bodies (limit to first 10KB for performance)
      const limitedRequestBody = request.requestBody?.substring(0, 10240) || '';
      const limitedResponseBody = request.responseBody?.substring(0, 10240) || '';

      if (match(limitedRequestBody) || match(limitedResponseBody)) {
        return true;
      }

      return false;
    },
    [useRegex, matchCase, matchWholeWord],
  );

  // Reverse requests so newest are at the top (most recent timestamp first)
  const reversedRequests = useMemo(() => {
    return [...requests].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }, [requests]);

  const table = useReactTable({
    data: reversedRequests,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      globalFilter: debouncedSearchTerm,
      columnVisibility: { id: false },
      rowSelection,
    },
    onGlobalFilterChange: onSearchChange,
    globalFilterFn,
    getRowId: (row) => row.id,
  });

  // Virtualization setup
  const rows = table.getRowModel().rows;
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 32, // Accurate row height estimate based on actual content
    overscan: 8, // Reduced overscan for better performance
    measureElement: (element) => {
      // Measure actual height and clamp to prevent extreme values
      if (!element) return 32;
      const height = element.getBoundingClientRect?.()?.height;
      if (!height || height < 20) return 32;
      if (height > 80) return 32; // Most rows should be around 32px, clamp outliers
      return height;
    },
  });

  const [showScrollToSelected, setShowScrollToSelected] = useState(false);

  const handleScroll = useCallback(() => {
    const container = tableContainerRef.current;
    if (!container || !selectedId) {
      setShowScrollToSelected(false);
      return;
    }

    const idx = rows.findIndex((row) => row.original.id === selectedId);
    if (idx === -1) {
      setShowScrollToSelected(false);
      return;
    }

    const rowTop = idx * 32 + 32;
    const scrollTop = container.scrollTop;
    const clientHeight = container.clientHeight;

    const isOutOfView = rowTop < scrollTop + 16 || rowTop > scrollTop + clientHeight - 48;
    setShowScrollToSelected(isOutOfView);
  }, [rows, selectedId]);

  useEffect(() => {
    handleScroll();
  }, [selectedId, handleScroll]);

  useEffect(() => {
    onSelectionChange?.(Object.keys(rowSelection));
  }, [rowSelection, onSelectionChange]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (targetDropdownRef.current && !targetDropdownRef.current.contains(e.target as Node)) {
        setIsTargetDropdownOpen(false);
      }
    };
    if (isTargetDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
    return undefined;
  }, [isTargetDropdownOpen]);

  const scrollToSelected = () => {
    const idx = rows.findIndex((row) => row.original.id === selectedId);
    if (idx !== -1) {
      rowVirtualizer.scrollToIndex(idx, { align: 'center' });
    }
  };

  return (
    <div className="h-full w-full flex flex-col text-sm overflow-hidden relative">
      <style>{`
        @keyframes intercept-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes intercept-border-pulse {
          0%, 100% { border-left-color: rgba(245, 158, 11, 0.4); }
          50% { border-left-color: rgba(245, 158, 11, 0.9); }
        }
        .intercept-pending-row {
          animation: intercept-border-pulse 1.5s ease-in-out infinite;
        }
        /* Fix scrollbar thumb height to 50% of container */
        .request-table-scroll::-webkit-scrollbar-thumb {
          height: 50% !important;
          min-height: 40px !important;
        }
        /* For Firefox - use thin scrollbar with fixed ratio approximation */
        .request-table-scroll {
          scrollbar-width: thin;
          scrollbar-color: var(--scrollbar-thumb, #4a4a6a) transparent;
        }
      `}</style>
      <div className="h-10 flex items-center px-2 border-b border-divider gap-2 shrink-0">
        <div className="flex-1 flex items-center gap-2 bg-input-background border border-border rounded px-3 h-7">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Filter requests..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full h-full bg-transparent border-none outline-none text-xs text-text-primary placeholder:text-text-secondary"
            />
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {searchTerm && (
              <span className="text-[10px] text-text-secondary whitespace-nowrap mr-0.5">
                {table.getFilteredRowModel().rows.length === 0
                  ? 'No results'
                  : `Found ${table.getFilteredRowModel().rows.length} requests`}
              </span>
            )}
            <button
              onClick={() => setMatchCase(!matchCase)}
              className={cn(
                'p-1 rounded transition-colors',
                matchCase
                  ? 'bg-primary/20 text-primary hover:bg-primary/30'
                  : 'text-text-secondary hover:bg-sidebar-item-hover hover:text-text-primary',
              )}
              title="Match case"
            >
              <CaseSensitive className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setMatchWholeWord(!matchWholeWord)}
              className={cn(
                'p-1 rounded transition-colors',
                matchWholeWord
                  ? 'bg-primary/20 text-primary hover:bg-primary/30'
                  : 'text-text-secondary hover:bg-sidebar-item-hover hover:text-text-primary',
              )}
              title="Match whole word"
            >
              <Type className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setUseRegex(!useRegex)}
              className={cn(
                'p-1 rounded transition-colors',
                useRegex
                  ? 'bg-success/20 text-success hover:bg-success/30'
                  : 'text-text-secondary hover:bg-sidebar-item-hover hover:text-text-primary',
              )}
              title="Use regular expression"
            >
              <Regex className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1 border-l border-divider pl-2 h-full">
          {/* Start/Stop Target button */}
          <div ref={targetDropdownRef} className="relative flex items-center gap-0.5">
            {isTargetActive && activeTargetMode && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-text-secondary bg-card-background border border-border/30 rounded">
                <span
                  className={cn(
                    'w-1.5 h-1.5 rounded-full animate-pulse',
                    activeTargetMode === 'cdp' ? 'bg-blue-400' : 'bg-amber-400',
                  )}
                />
                Running by {activeTargetMode.toUpperCase()}
              </span>
            )}
            <button
              onClick={() => {
                if (isTargetActive) {
                  // Stop: disconnect CDP or stop proxy
                  onStopTarget();
                  // Clear all requests data
                  onClearRequests?.();
                } else {
                  setIsTargetDropdownOpen(!isTargetDropdownOpen);
                }
              }}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded transition-all duration-300 text-xs font-medium',
                isTargetActive
                  ? 'bg-error/20 text-error hover:bg-error/30'
                  : 'bg-card-background text-text-secondary hover:bg-card-hover',
              )}
              title={isTargetActive ? 'Stop target' : 'Start target'}
            >
              {isTargetActive ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Stop</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Start</span>
                </>
              )}
            </button>
            {isTargetDropdownOpen && !isTargetActive && (
              <div
                className="fixed mt-1 rounded-md border border-border group-hover:border-primary bg-dropdown-background shadow-[0_4px_20px_rgba(0,0,0,0.15)] z-[9999] min-w-[220px] overflow-hidden group"
                style={{
                  top: targetDropdownRef.current
                    ? targetDropdownRef.current.getBoundingClientRect().bottom + 4
                    : 0,
                  left: targetDropdownRef.current
                    ? targetDropdownRef.current.getBoundingClientRect().left
                    : 0,
                }}
              >
                <button
                  onClick={() => {
                    // Clear old requests before starting new session
                    onClearRequests?.();
                    // Call parent to update state (this will trigger re-render with new props)
                    onStartTarget('mitm');
                    setIsTargetDropdownOpen(false);
                    // Start MITM proxy
                    window.api
                      .invoke('proxy:create-session', 'default')
                      .then(async () => {
                        // Launch target app/browser
                        if (onLaunchTarget && currentTargetAppId) {
                          await onLaunchTarget(
                            currentTargetAppId,
                            'http://127.0.0.1:8081',
                            currentTargetUrl,
                            'browser',
                          );
                        }
                      })
                      .catch(() => {
                        // Revert state on failure
                        onStopTarget();
                      });
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-primary hover:bg-dropdown-item-hover transition-all border-b border-border last:border-b-0"
                >
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                  <span>MITM</span>
                  <span className="text-text-secondary text-[10px]">(Man-in-the-Middle)</span>
                </button>
                <button
                  onClick={() => {
                    // Clear old requests before starting new session
                    onClearRequests?.();
                    console.log('[CDP] Starting CDP mode');
                    // Call parent to update state (this will trigger re-render with new props)
                    onStartTarget('cdp');
                    setIsTargetDropdownOpen(false);
                    // Launch target with CDP mode first, then connect
                    if (onLaunchTarget && currentTargetAppId) {
                      onLaunchTarget(
                        currentTargetAppId,
                        'http://127.0.0.1:8081',
                        currentTargetUrl,
                        'cdp',
                      )
                        .then(async () => {
                          // Wait a bit for Chrome to start
                          await new Promise((resolve) => setTimeout(resolve, 2000));
                          // Try connecting on ports
                          const ports = [9223, 9224, 9225, 9222];
                          let connected = false;
                          for (const port of ports) {
                            try {
                              const result = await window.api.invoke('cdp:connect', port);
                              if (result?.success) {
                                connected = true;
                                await window.api.invoke('cdp:reload');
                                // Inject subtle monitoring border
                                await window.api.invoke('cdp:inject-border');
                                break;
                              }
                            } catch {
                              // Continue to next port
                            }
                          }
                          if (!connected) {
                            // Revert state on failure
                            onStopTarget();
                          }
                        })
                        .catch(() => {
                          // Revert state on failure
                          onStopTarget();
                        });
                    } else {
                      // Revert state if no target
                      onStopTarget();
                    }
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-primary hover:bg-dropdown-item-hover transition-all"
                >
                  <Monitor className="w-3.5 h-3.5 text-blue" />
                  <span>CDP</span>
                  <span className="text-text-secondary text-[10px]">
                    (Chrome DevTools Protocol)
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Start Intercept button - only shows when MITM is active (Stop state) */}
          {isTargetActive && activeTargetMode === 'mitm' && (
            <button
              onClick={() => {
                onToggleIntercept();
              }}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded transition-all duration-300 text-xs font-medium',
                propsIsInterceptActive
                  ? 'bg-primary/20 text-primary hover:bg-primary/30'
                  : 'bg-transparent text-text-secondary hover:bg-sidebar-item-hover hover:text-text-primary',
              )}
              title={propsIsInterceptActive ? 'Stop intercept' : 'Start intercept'}
            >
              <CircleDashed className="w-3.5 h-3.5" />
              <span>{propsIsInterceptActive ? 'Intercepting' : 'Intercept'}</span>
            </button>
          )}
        </div>
      </div>
      <div
        ref={tableContainerRef}
        onScroll={handleScroll}
        className="request-table-scroll flex-1 flex flex-col overflow-auto relative"
      >
        <div className="flex h-10 min-h-10 flex-shrink-0 bg-table-header-background text-sm font-semibold text-text-secondary border-b border-divider/20 sticky top-0 z-10 w-full">
          {table.getHeaderGroups().map((headerGroup) => (
            <div key={headerGroup.id} className="flex w-full h-full">
              {headerGroup.headers.map((header) => {
                if (header.column.getIsVisible() === false) return null;

                const isHost = header.id === 'host';
                const isPath = header.id === 'path';
                const isFixed = !isHost && !isPath;

                return (
                  <div
                    key={header.id}
                    className={cn(
                      'h-full flex items-center shrink-0 whitespace-nowrap overflow-hidden text-ellipsis',
                      header.id === 'select' ? 'px-2 justify-center' : 'px-4',
                    )}
                    style={{
                      width: isFixed ? header.getSize() : 0,
                      flex: isHost ? '1 1 0px' : isPath ? '2 1 0px' : undefined,
                      minWidth: isHost ? '150px' : isPath ? '300px' : undefined,
                    }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            position: 'relative',
            width: '100%',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index];
            const isIntercepted = interceptedIds?.has(row.original.id);
            const isPending = pendingActionIds?.has(row.original.id);
            const isHighlighted = highlightedIds.has(row.original.id);

            return (
              <div
                key={row.id}
                ref={rowVirtualizer.measureElement}
                data-state={row.getValue('id') === selectedId ? 'selected' : undefined}
                onDragStart={(e) => e.preventDefault()}
                className={cn(
                  'flex items-center border-b border-divider/20 transition-colors cursor-pointer text-xs absolute left-0 top-0',
                  isPending
                    ? 'bg-warning/15 hover:bg-warning/25 border-l-4 border-l-warning intercept-pending-row'
                    : isIntercepted
                      ? 'bg-error/15 hover:bg-error/25 border-l-4 border-l-error'
                      : isHighlighted
                        ? 'bg-primary/10 hover:bg-primary/20 border-l-2 border-l-primary'
                        : 'hover:bg-table-row-hover',
                  row.original.id === selectedId &&
                    'bg-primary/15 text-text-primary hover:bg-primary/20',
                )}
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                  width: '100%',
                }}
                onClick={() => onSelect(row.original.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({ x: e.clientX, y: e.clientY, request: row.original });
                }}
              >
                {row.getVisibleCells().map((cell) => {
                  const isHost = cell.column.id === 'host';
                  const isPath = cell.column.id === 'path';
                  const isFixed = !isHost && !isPath;

                  return (
                    <div
                      key={cell.id}
                      className={cn(
                        'py-1.5 whitespace-nowrap overflow-hidden shrink-0 flex items-center',
                        cell.column.id === 'select' ? 'px-2 justify-center' : 'px-4',
                      )}
                      style={{
                        width: isFixed ? cell.column.getSize() : 0,
                        flex: isHost ? '1 1 0px' : isPath ? '2 1 0px' : undefined,
                        minWidth: isHost ? '150px' : isPath ? '300px' : undefined,
                      }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </div>
                  );
                })}
                {/* Dropdown menu button */}
                <div className="shrink-0 px-2">
                  <Dropdown>
                    <DropdownTrigger asChild>
                      <button
                        className="p-1 rounded hover:bg-dropdown-item-hover transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="w-3.5 h-3.5 text-text-secondary"
                        >
                          <circle cx="12" cy="12" r="1" />
                          <circle cx="19" cy="12" r="1" />
                          <circle cx="5" cy="12" r="1" />
                        </svg>
                      </button>
                    </DropdownTrigger>
                    <DropdownContent className="w-56">
                  <>
                    <DropdownItem onClick={() => handleCopySingleAsMarkdown(row.original)}>
                      <Copy className="mr-2 h-3.5 w-3.5 text-blue" />
                      <span>Copy as Markdown</span>
                    </DropdownItem>
                    <DropdownItem onClick={() => handleCopySingleAsJson(row.original)}>
                      <Copy className="mr-2 h-3.5 w-3.5 text-blue" />
                      <span>Copy as JSON</span>
                    </DropdownItem>

                    <DropdownSeparator />

                    <DropdownItem onClick={() => onSetCompare1(row.original)}>
                      <ArrowLeftRight className="mr-2 h-3.5 w-3.5 text-emerald-400" />
                      <span>Set as Compare 1</span>
                    </DropdownItem>
                    <DropdownItem onClick={() => onSetCompare2(row.original)}>
                      <ArrowLeftRight className="mr-2 h-3.5 w-3.5 text-emerald-400" />
                      <span>Set as Compare 2</span>
                    </DropdownItem>

                    <DropdownSeparator />

                    <DropdownItem onClick={() => onAnalyzeRequest?.(row.original)}>
                      <BookmarkPlus className="mr-2 h-3.5 w-3.5 text-indigo-400" />
                      <span>Analyze Request</span>
                    </DropdownItem>

                    <DropdownItem onClick={() => onSendToRepeater?.(row.original)}>
                      <Zap className="mr-2 h-3.5 w-3.5 text-amber-400" />
                      <span>Send to Repeater</span>
                    </DropdownItem>

                    <DropdownItem onClick={() => toggleHighlight(row.original.id)}>
                      <Star
                        className={cn(
                          'mr-2 h-3.5 w-3.5',
                          isHighlighted ? 'fill-warning text-warning' : 'text-yellow-400',
                        )}
                      />
                      <span>{isHighlighted ? 'Unhighlight' : 'Highlight'}</span>
                    </DropdownItem>

                    <DropdownSeparator />

                    <DropdownItem
                      onClick={() => onDelete?.(row.original.id)}
                      className="text-error focus:text-error focus:bg-error/10"
                    >
                      <Trash2 className="mr-2 h-3.5 w-3.5" />
                      <span>Delete</span>
                    </DropdownItem>
                  </>
                </DropdownContent>
                  </Dropdown>
                </div>
              </div>
            );
          })}
        </div>

        {rows.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-text-secondary w-full">
            No requests found
          </div>
        )}
      </div>
      {Object.keys(rowSelection).length > 0 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-modal-background border border-border/80 rounded-full shadow-2xl px-4 py-2 flex items-center gap-3 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <span className="text-xs font-medium text-text-secondary">
            {String(Object.keys(rowSelection).length)} selected
          </span>
          <div className="w-[1px] h-3.5 bg-border" />
          <Dropdown>
            <DropdownTrigger asChild>
              <button className="text-xs text-primary hover:text-primary/80 font-semibold transition-colors flex items-center gap-1.5 focus:outline-none">
                Copy Selected
              </button>
            </DropdownTrigger>
            <DropdownContent className="min-w-[340px] bottom-full left-1/2 -translate-x-1/2 mb-2">
              <div className="flex items-center gap-2 px-2.5 py-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <Copy className="w-3.5 h-3.5 text-primary" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-text-primary">Copy Selected</div>
                  <div className="text-[10px] text-text-secondary">
                    {Object.keys(rowSelection).length} {Object.keys(rowSelection).length} selected
                  </div>
                </div>
              </div>

              <div className="h-px bg-divider/60 mx-1" />

              <div className="px-2 pt-2 pb-1">
                <div className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-2 px-1">
                  Sections
                </div>
                <div className="space-y-0.5">
                  {[
                    {
                      key: 'status' as const,
                      label: 'Status + Type + Host + Path',
                      icon: Globe,
                    },
                    {
                      key: 'headers' as const,
                      label: 'Headers',
                      icon: List,
                    },
                    {
                      key: 'body' as const,
                      label: 'Body',
                      icon: Box,
                    },
                    {
                      key: 'security' as const,
                      label: 'Security',
                      icon: ShieldAlert,
                    },
                  ].map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      onClick={(e: React.MouseEvent) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleCopySection(key);
                      }}
                      className={cn(
                        'w-full flex items-center gap-5 px-2.5 py-2 rounded-lg transition-all duration-150 text-xs',
                        copySections[key]
                          ? 'bg-card-background/80 text-text-primary'
                          : 'text-text-secondary hover:text-text-primary hover:bg-card-background/40',
                      )}
                    >
                      <Icon
                        className={cn(
                          'w-3.5 h-3.5 shrink-0 transition-colors',
                          copySections[key] ? 'text-primary' : 'text-text-secondary',
                        )}
                      />
                      <span className="flex-1 text-left">{label}</span>
                      <div
                        className={cn(
                          'w-7 h-4 rounded-md relative transition-all duration-200 shrink-0',
                          copySections[key]
                            ? 'bg-primary/40 border border-primary/50'
                            : 'bg-border/50 border border-border/50',
                        )}
                      >
                        <div
                          className={cn(
                            'absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-sm transition-all duration-200 shadow-sm',
                            copySections[key]
                              ? 'left-[calc(100%-0.85rem)] bg-primary'
                              : 'left-0.5 bg-text-secondary',
                          )}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-px bg-divider/60 mx-1 mt-1" />

              <div className="px-2 pt-2 pb-1">
                <div className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-2 px-1">
                  Format
                </div>
                <div className="flex gap-1 p-0.5 bg-modal-background rounded-lg border border-border">
                  <button
                    onClick={(e: React.MouseEvent) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setCopyFormat('json');
                    }}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all duration-150',
                      copyFormat === 'json'
                        ? 'bg-card-background text-text-primary shadow-sm'
                        : 'text-text-secondary hover:text-text-primary',
                    )}
                  >
                    <span className="text-[10px] font-mono font-bold bg-primary/10 text-primary px-1 rounded">
                      &#123;&#125;
                    </span>
                    JSON
                  </button>
                  <button
                    onClick={(e: React.MouseEvent) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setCopyFormat('markdown');
                    }}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all duration-150',
                      copyFormat === 'markdown'
                        ? 'bg-card-background text-text-primary shadow-sm'
                        : 'text-text-secondary hover:text-text-primary',
                    )}
                  >
                    <span className="text-[10px] font-mono font-bold text-warning/80">M↓</span>
                    Markdown
                  </button>
                </div>
              </div>

              <div className="h-px bg-divider/60 mx-1 mt-1" />

              <div className="px-2 py-2">
                <button
                  onClick={(e: React.MouseEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleCopySelectedWithOptions();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-semibold transition-all duration-150 active:scale-[0.98] shadow-sm shadow-primary/20"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy to Clipboard
                </button>
              </div>
            </DropdownContent>
          </Dropdown>
          <button
            onClick={() => setRowSelection({})}
            className="text-xs text-text-secondary hover:text-text-primary transition-colors"
          >
            Deselect
          </button>
        </div>
      )}
      {/* Right-click context menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-[9999]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <Dropdown open={true} onOpenChange={(open) => !open && setContextMenu(null)}>
            <DropdownTrigger>
              <div style={{ width: 1, height: 1 }} />
            </DropdownTrigger>
            <DropdownContent className="min-w-[180px]">
              <DropdownItem
                icon={<Copy className="w-3.5 h-3.5 text-blue" />}
                onClick={() => {
                  handleCopySingleAsMarkdown(contextMenu.request);
                  setContextMenu(null);
                }}
              >
                Copy as Markdown
              </DropdownItem>
              <DropdownItem
                icon={<Copy className="w-3.5 h-3.5 text-blue" />}
                onClick={() => {
                  handleCopySingleAsJson(contextMenu.request);
                  setContextMenu(null);
                }}
              >
                Copy as JSON
              </DropdownItem>
              <DropdownSeparator />
              <DropdownItem
                icon={<ArrowLeftRight className="w-3.5 h-3.5 text-emerald-400" />}
                onClick={() => {
                  onSetCompare1(contextMenu.request);
                  setContextMenu(null);
                }}
              >
                Set as Compare 1
              </DropdownItem>
              <DropdownItem
                icon={<ArrowLeftRight className="w-3.5 h-3.5 text-emerald-400" />}
                onClick={() => {
                  onSetCompare2(contextMenu.request);
                  setContextMenu(null);
                }}
              >
                Set as Compare 2
              </DropdownItem>
              <DropdownSeparator />
              {onAnalyzeRequest && (
                <DropdownItem
                  icon={<BookmarkPlus className="w-3.5 h-3.5 text-indigo-400" />}
                  onClick={() => {
                    onAnalyzeRequest(contextMenu.request);
                    setContextMenu(null);
                  }}
                >
                  Analyze Request
                </DropdownItem>
              )}
              {onSendToRepeater && (
                <DropdownItem
                  icon={<Zap className="w-3.5 h-3.5 text-amber-400" />}
                  onClick={() => {
                    onSendToRepeater(contextMenu.request);
                    setContextMenu(null);
                  }}
                >
                  Send to Repeater
                </DropdownItem>
              )}
              <DropdownItem
                icon={
                  <Star
                    className={cn(
                      'w-3.5 h-3.5',
                      highlightedIds.has(contextMenu.request.id)
                        ? 'fill-warning text-warning'
                        : 'text-yellow-400',
                    )}
                  />
                }
                onClick={() => {
                  toggleHighlight(contextMenu.request.id);
                  setContextMenu(null);
                }}
              >
                {highlightedIds.has(contextMenu.request.id) ? 'Unhighlight' : 'Highlight'}
              </DropdownItem>
              <DropdownSeparator />
              {onDelete && (
                <DropdownItem
                  icon={<Trash2 className="w-3.5 h-3.5 text-red-400" />}
                  variant="error"
                  onClick={() => {
                    onDelete(contextMenu.request.id);
                    setContextMenu(null);
                  }}
                >
                  Delete
                </DropdownItem>
              )}
            </DropdownContent>
          </Dropdown>
        </div>
      )}
      {showScrollToSelected && (
        <button
          onClick={scrollToSelected}
          className="absolute bottom-4 right-4 z-40 w-8 h-8 rounded-full bg-primary text-zinc-950 flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
          title="Scroll to focused request"
        >
          <Target className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
