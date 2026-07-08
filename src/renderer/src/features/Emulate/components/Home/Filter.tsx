import { useState, useRef, useMemo, useEffect } from 'react';
import { X, Globe } from 'lucide-react';
import { cn } from '../../../../shared/lib/utils';

import { getRequestCategory } from '../../utils/requestHelpers';
import { useAccentColors } from '../../../../shared/hooks/useAccentColors';
import { NetworkRequest } from '../../types/inspector';

// Re-export NetworkRequest from inspector types to maintain single source of truth
export type { NetworkRequest };

export interface InspectorFilter {
  methods: {
    GET: boolean;
    POST: boolean;
    PUT: boolean;
    PATCH: boolean;
    DELETE: boolean;
    HEAD: boolean;
    OPTIONS: boolean;
    TRACE: boolean;
    CONNECT: boolean;
  };
  host: {
    whitelist: string[];
  };
  path: {
    whitelist: string[];
  };
  status: {
    [key: number]: boolean;
  };
  type: {
    xhr: boolean;
    js: boolean;
    css: boolean;
    img: boolean;
    media: boolean;
    font: boolean;
    doc: boolean;
    ws: boolean;
    wasm: boolean;
    manifest: boolean;
    other: boolean;
  };
  size: {
    min: string;
    max: string;
  };
  time: {
    min: string;
    max: string;
  };
}

export const initialFilterState: InspectorFilter = {
  methods: {
    GET: true,
    POST: true,
    PUT: true,
    PATCH: false,
    DELETE: true,
    HEAD: false,
    OPTIONS: true,
    TRACE: false,
    CONNECT: false,
  },
  host: { whitelist: [] },
  path: { whitelist: [] },
  status: {
    200: true,
    201: true,
    202: true,
    204: true,
    206: true,
    301: true,
    302: true,
    304: true,
    307: true,
    308: true,
    400: true,
    401: true,
    403: true,
    404: true,
    405: true,
    409: true,
    422: true,
    429: true,
    500: true,
    501: true,
    502: true,
    503: true,
    504: true,
    505: true,
  },
  type: {
    xhr: true,
    js: true,
    css: true,
    img: true,
    media: true,
    font: true,
    doc: true,
    ws: true,
    wasm: true,
    manifest: true,
    other: true,
  },
  size: { min: '', max: '' },
  time: { min: '', max: '' },
};

interface NetworkFilterProps {
  filter: InspectorFilter;
  onChange: (filter: InspectorFilter) => void;
  requests?: NetworkRequest[];
  targetId?: string | null;
}

function ListFilterSection({
  title,
  lists,
  onChange,
  allItems = [],
  getColorForItem,
}: {
  title: string;
  lists: { whitelist: string[] };
  onChange: (lists: { whitelist: string[] }) => void;
  allItems?: string[];
  getColorForItem?: (item: string) => string;
}) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const filteredSuggestions = allItems.filter((item) => {
    if (!input.trim()) return true;
    try {
      const regex = new RegExp(input, 'i');
      return regex.test(item);
    } catch {
      return item.toLowerCase().includes(input.toLowerCase());
    }
  });

  const handleAdd = (value: string) => {
    if (!value.trim()) return;
    const currentList = lists.whitelist || [];
    if (currentList.includes(value.trim())) return;
    onChange({ ...lists, whitelist: [...currentList, value.trim()] });
  };

  const handleRemove = (value: string) => {
    const currentList = lists.whitelist || [];
    onChange({ ...lists, whitelist: currentList.filter((v) => v !== value) });
  };

  const handleSelectSuggestion = (suggestion: string) => {
    const isAlreadyAdded = (lists.whitelist || []).includes(suggestion);
    if (isAlreadyAdded) {
      handleRemove(suggestion);
    } else {
      handleAdd(suggestion);
    }
  };

  return (
    <section>
      <h3 className="text-xs font-semibold mb-2">{title}</h3>
      <div className="space-y-1.5">
        <div className="flex gap-1.5 relative w-full items-center">
          <div className="flex-1">
            <input
              className="w-full bg-input-background border border-input-border-default hover:border-input-border-hover focus:border-primary/70 rounded px-3 py-2 text-xs focus:bg-input-background/80 outline-none h-10 transition-all text-text-primary placeholder:text-text-secondary"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setShowSuggestions(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAdd(input);
                  setInput('');
                } else if (e.key === 'Escape') {
                  setShowSuggestions(false);
                }
              }}
              onFocus={() => {
                setShowSuggestions(true);
              }}
              placeholder={`Filter ${title}...`}
            />
          </div>
          {showSuggestions && (
            <button
              onClick={() => setShowSuggestions(false)}
              className="bg-input-background hover:bg-error/10 border border-input-border-default hover:border-error/40 rounded text-text-secondary hover:text-error w-10 h-10 flex items-center justify-center transition-colors shrink-0"
              title="Close suggestions"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {showSuggestions && filteredSuggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              className="absolute top-full mt-1 left-0 right-0 max-h-64 overflow-y-auto bg-background border border-divider rounded-md shadow-xl z-50"
            >
              <div className="p-1 flex flex-col gap-1">
                {filteredSuggestions.map((suggestion) => {
                  const isAlreadyAdded = (lists.whitelist || []).includes(suggestion);
                  return (
                    <button
                      key={suggestion}
                      onClick={() => handleSelectSuggestion(suggestion)}
                      className={cn(
                        'w-full text-left px-2 py-2 text-xs rounded transition-colors flex items-center justify-between gap-2 min-w-0',
                        isAlreadyAdded
                          ? 'bg-primary/20 text-primary font-medium hover:bg-primary/30'
                          : 'hover:bg-sidebar-item-hover/40 text-text-secondary hover:text-text-primary',
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Globe className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span className="truncate">{suggestion}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        {(lists.whitelist || []).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {(lists.whitelist || []).map((item) => {
              const isHost = title.toLowerCase() === 'host';
              const color = getColorForItem ? getColorForItem(item) : undefined;
              return (
                <span
                  key={item}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs border cursor-default',
                  )}
                  style={
                    color
                      ? {
                          color: color,
                          borderColor: color,
                          backgroundColor: `${color}20`,
                        }
                      : undefined
                  }
                >
                  {isHost && (
                    <Globe
                      className="w-3 h-3 shrink-0"
                      style={{ color: color || 'currentColor' }}
                    />
                  )}
                  <span className="truncate max-w-[200px]">{item}</span>
                  <button
                    onClick={() => handleRemove(item)}
                    className="hover:bg-current/15 rounded-full p-0.5 opacity-70 hover:opacity-100 transition-all shrink-0"
                    title="Remove filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export function NetworkFilter({ filter, onChange, requests = [], targetId }: NetworkFilterProps) {
  // [DEBUG] NetworkFilter render
  console.log('[DEBUG] NetworkFilter rendered', { requestsCount: requests.length, targetId });
  
  const { getColorByIndex } = useAccentColors();

  // Storage key for filter data
  const getStorageKey = () => {
    const base = targetId ? `repeater-${targetId}` : 'repeater-default';
    return `${base}-filter`;
  };

  // Load filter from storage on mount
  useEffect(() => {
    if (!targetId) return;
    try {
      const key = getStorageKey();
      const data = localStorage.getItem(key);
      if (data) {
        const savedFilter = JSON.parse(data);
        // Merge with current filter to preserve structure
        onChange({
          ...filter,
          methods: savedFilter.methods || filter.methods,
          host: savedFilter.host || filter.host,
          status: savedFilter.status || filter.status,
          type: savedFilter.type || filter.type,
        });
      }
    } catch {
      // Ignore errors
    }
  }, [targetId]);

  // Save filter to storage whenever it changes
  useEffect(() => {
    if (!targetId) return;
    try {
      const key = getStorageKey();
      const dataToSave = {
        methods: filter.methods,
        host: filter.host,
        status: filter.status,
        type: filter.type,
      };
      localStorage.setItem(key, JSON.stringify(dataToSave));
    } catch {
      // Ignore errors
    }
  }, [filter, targetId]);

  const allHosts = Array.from(new Set(requests.map((r) => r.host).filter(Boolean)));

  const availableStatuses = Array.from(
    new Set(
      requests
        .filter((r) => r.protocol === 'https' && typeof r.status === 'number')
        .map((r) => r.status),
    ),
  ).sort((a, b) => (a || 0) - (b || 0));

  const availableMethods = Array.from(
    new Set(requests.map((r) => r.method?.toUpperCase()).filter(Boolean)),
  ).sort();

  const availableTypes = Array.from(
    new Set(requests.map((r) => getRequestCategory(r)).filter(Boolean)),
  ).sort();

  // Generate color mappings using accentColors from theme
  const typeConfig: Record<string, { label: string; color: string; bgColor: string }> =
    useMemo(() => {
      const getColor = (index: number) => {
        const color = getColorByIndex(index);
        return color;
      };

      return {
        xhr: {
          label: 'XHR',
          color: getColor(0),
          bgColor: getColor(0),
        },
        js: {
          label: 'JS',
          color: getColor(1),
          bgColor: getColor(1),
        },
        css: {
          label: 'CSS',
          color: getColor(2),
          bgColor: getColor(2),
        },
        img: {
          label: 'Image',
          color: getColor(3),
          bgColor: getColor(3),
        },
        media: {
          label: 'Media',
          color: getColor(4),
          bgColor: getColor(4),
        },
        font: {
          label: 'Font',
          color: getColor(5),
          bgColor: getColor(5),
        },
        doc: {
          label: 'Document',
          color: getColor(6),
          bgColor: getColor(6),
        },
        ws: {
          label: 'WebSocket',
          color: getColor(7),
          bgColor: getColor(7),
        },
        wasm: {
          label: 'WebAssembly',
          color: getColor(8),
          bgColor: getColor(8),
        },
        manifest: {
          label: 'Manifest',
          color: getColor(9),
          bgColor: getColor(9),
        },
        other: {
          label: 'Other',
          color: getColor(10),
          bgColor: getColor(10),
        },
      };
    }, [getColorByIndex]);

  const methodColors: Record<string, { color: string; bgColor: string }> = useMemo(() => {
    const getColor = (index: number) => {
      const color = getColorByIndex(index);
      return color;
    };

    return {
      GET: { color: getColor(0), bgColor: getColor(0) },
      POST: { color: getColor(1), bgColor: getColor(1) },
      PUT: { color: getColor(2), bgColor: getColor(2) },
      PATCH: { color: getColor(3), bgColor: getColor(3) },
      DELETE: { color: getColor(4), bgColor: getColor(4) },
      HEAD: { color: getColor(5), bgColor: getColor(5) },
      OPTIONS: { color: getColor(6), bgColor: getColor(6) },
      TRACE: { color: getColor(7), bgColor: getColor(7) },
      CONNECT: { color: getColor(8), bgColor: getColor(8) },
    };
  }, [getColorByIndex]);

  return (
    <div className="h-full overflow-y-auto min-h-0 border-l border-border/50 font-sans select-none">
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Method */}
        <section className="min-w-0 col-span-1 md:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold">Method</h3>
          </div>
          {availableMethods.length === 0 ? (
            <div className="text-xs text-muted-foreground italic px-2">No methods available</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {availableMethods.map((key) => {
                const safeKey = key as string;
                const color = methodColors[safeKey] || methodColors['GET'];
                const isVisible = filter.methods[safeKey as keyof typeof filter.methods] !== false;

                return (
                  <button
                    key={key}
                    onClick={() =>
                      onChange({
                        ...filter,
                        methods: {
                          ...filter.methods,
                          [key]: !isVisible,
                        },
                      })
                    }
                    className={cn(
                      'px-3 py-1 rounded text-xs font-medium border transition-all',
                      isVisible
                        ? 'text-text-primary'
                        : 'text-muted-foreground border-border bg-transparent opacity-50',
                    )}
                    style={
                      isVisible
                        ? {
                            color: color.color,
                            borderColor: color.color,
                          }
                        : undefined
                    }
                    title={isVisible ? 'Click to hide' : 'Click to show'}
                  >
                    {key}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Host */}
        <section className="min-w-0 col-span-1 md:col-span-2">
          <ListFilterSection
            title="Host"
            lists={filter.host}
            onChange={(newHost) => onChange({ ...filter, host: newHost })}
            allItems={allHosts}
            getColorForItem={(item) => {
              const hash = item.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
              return getColorByIndex(hash % 8);
            }}
          />
        </section>

        {/* Status */}
        <section className="min-w-0 col-span-1 md:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold">Status</h3>
          </div>
          {availableStatuses.length === 0 ? (
            <div className="text-xs text-muted-foreground italic px-2">No statuses available</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {availableStatuses.map((code) => {
                const safeCode = typeof code === 'number' ? code : 0;
                let colorClass = 'text-text-secondary border-border';
                if (safeCode >= 200 && safeCode < 300) colorClass = 'text-green border-green/30';
                else if (safeCode >= 300 && safeCode < 400)
                  colorClass = 'text-yellow border-yellow/30';
                else if (safeCode >= 400 && safeCode < 500) colorClass = 'text-red border-red/30';
                else if (safeCode >= 500) colorClass = 'text-rose-400 border-rose-400/30';

                const isVisible = filter.status[safeCode] !== false;

                return (
                  <button
                    key={safeCode}
                    onClick={() =>
                      onChange({
                        ...filter,
                        status: {
                          ...filter.status,
                          [safeCode]: !isVisible,
                        },
                      })
                    }
                    className={cn(
                      'px-3 py-1 rounded text-xs font-medium border transition-all whitespace-nowrap',
                      isVisible
                        ? colorClass
                        : 'text-muted-foreground border-border bg-transparent opacity-50',
                    )}
                    title={isVisible ? 'Click to hide' : 'Click to show'}
                  >
                    {safeCode}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Type */}
        <section className="min-w-0 col-span-1 md:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold">Type</h3>
          </div>
          {availableTypes.length === 0 ? (
            <div className="text-xs text-muted-foreground italic px-2">No types available</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {availableTypes.map((key) => {
                const safeKey = key as string;
                const config = typeConfig[safeKey] || typeConfig['other'];
                const isVisible = filter.type[safeKey as keyof typeof filter.type] !== false;

                return (
                  <button
                    key={key}
                    onClick={() =>
                      onChange({
                        ...filter,
                        type: {
                          ...filter.type,
                          [safeKey]: !isVisible,
                        },
                      })
                    }
                    className={cn(
                      'px-3 py-1 rounded text-xs font-medium border transition-all',
                      isVisible
                        ? 'text-text-primary'
                        : 'text-muted-foreground border-border bg-transparent opacity-50',
                    )}
                    style={
                      isVisible
                        ? {
                            color: config.color,
                            borderColor: config.color,
                          }
                        : undefined
                    }
                    title={isVisible ? 'Click to hide' : 'Click to show'}
                  >
                    {config.label}
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
