import { useState, useRef, useMemo } from 'react';
import { X, Globe, Link } from 'lucide-react';
import { cn } from '../../../../shared/lib/utils';
import { Favicon } from '../../../../shared/utils/faviconUtils';

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
}

const badgeColors = [
  'bg-blue-500/10 text-blue-400 border-blue-500/25',
  'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
  'bg-purple-500/10 text-purple-400 border-purple-500/25',
  'bg-amber-500/10 text-amber-400 border-amber-500/25',
  'bg-rose-500/10 text-rose-400 border-rose-500/25',
  'bg-cyan-500/10 text-cyan-400 border-cyan-500/25',
  'bg-pink-500/10 text-pink-400 border-pink-500/25',
  'bg-indigo-500/10 text-indigo-400 border-indigo-500/25',
];

const getDeterministicColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % badgeColors.length;
  return badgeColors[index];
};

function ListFilterSection({
  title,
  lists,
  onChange,
  allItems = [],
}: {
  title: string;
  lists: { whitelist: string[] };
  onChange: (lists: { whitelist: string[] }) => void;
  allItems?: string[];
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
              className="absolute top-full mt-1 left-0 right-0 max-h-64 overflow-y-auto bg-modal-background border border-divider rounded-md shadow-xl z-50"
            >
              <div className="p-1 flex flex-col gap-1">
                {filteredSuggestions.map((suggestion) => {
                  const isAlreadyAdded = (lists.whitelist || []).includes(suggestion);
                  const isHost = title.toLowerCase() === 'host';
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
                        {isHost ? (
                          <Favicon
                            url={`https://${suggestion}`}
                            size={14}
                            className="rounded-sm shrink-0"
                            fallbackIcon={<Globe className="w-3.5 h-3.5 text-zinc-400" />}
                          />
                        ) : (
                          <Link className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        )}
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
              const colorClass = getDeterministicColor(item);
              return (
                <span
                  key={item}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs border cursor-default',
                    colorClass,
                  )}
                >
                  {isHost && (
                    <Favicon
                      url={`https://${item}`}
                      size={12}
                      className="rounded-sm shrink-0"
                      fallbackIcon={<Globe className="w-3 h-3 text-zinc-400" />}
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

export function NetworkFilter({ filter, onChange, requests = [] }: NetworkFilterProps) {
  
  const { accentColors, getColorByIndex } = useAccentColors();

  const allHosts = Array.from(new Set(requests.map((r) => r.host).filter(Boolean)));

  const availableStatuses = Array.from(
    new Set(
      requests
        .filter((r) => r.protocol === 'https' && typeof r.status === 'number')
        .map((r) => r.status),
    ),
  ).sort((a, b) => a - b);

  const availableMethods = Array.from(
    new Set(requests.map((r) => r.method?.toUpperCase()).filter(Boolean)),
  ).sort();

  const availableTypes = Array.from(
    new Set(requests.map((r) => getRequestCategory(r)).filter(Boolean)),
  ).sort();

  // Generate color mappings using accentColors from theme
  const typeConfig: Record<string, { label: string; color: string; bgColor: string }> = useMemo(() => {
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
        <section className="min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold">Method</h3>
          </div>
          {availableMethods.length === 0 ? (
            <div className="text-xs text-muted-foreground italic px-2">
              No methods available
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {availableMethods.map((key) => {
                const color = methodColors[key] || methodColors['GET'];
                const isVisible = filter.methods[key as keyof typeof filter.methods] !== false;

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
                        ? color
                        : 'text-muted-foreground border-border bg-transparent opacity-50',
                    )}
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
          />
        </section>

        {/* Status */}
        <section className="min-w-0 col-span-1 md:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold">Status</h3>
          </div>
          {availableStatuses.length === 0 ? (
            <div className="text-xs text-muted-foreground italic px-2">
              No statuses available
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {availableStatuses.map((code) => {
                let color = 'text-gray-400 border-gray-400/30 bg-gray-400/10';
                if (code >= 200 && code < 300)
                  color = 'text-green-400 border-green-400/30 bg-green-400/10';
                else if (code >= 300 && code < 400)
                  color = 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10';
                else if (code >= 400 && code < 500)
                  color = 'text-red-400 border-red-400/30 bg-red-400/10';
                else if (code >= 500) color = 'text-rose-400 border-rose-400/30 bg-rose-400/10';

                const isVisible = filter.status[code] !== false;

                return (
                  <button
                    key={code}
                    onClick={() =>
                      onChange({
                        ...filter,
                        status: {
                          ...filter.status,
                          [code]: !isVisible,
                        },
                      })
                    }
                    className={cn(
                      'px-3 py-1 rounded text-xs font-medium border transition-all whitespace-nowrap',
                      isVisible
                        ? color
                        : 'text-muted-foreground border-border bg-transparent opacity-50',
                    )}
                    title={isVisible ? 'Click to hide' : 'Click to show'}
                  >
                    {code}
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
            <div className="text-xs text-muted-foreground italic px-2">
              No types available
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {availableTypes.map((key) => {
                const config = typeConfig[key] || typeConfig['other'];
                const isVisible = filter.type[key as keyof typeof filter.type] !== false;

                return (
                  <button
                    key={key}
                    onClick={() =>
                      onChange({
                        ...filter,
                        type: {
                          ...filter.type,
                          [key]: !isVisible,
                        },
                      })
                    }
                    className={cn(
                      'px-3 py-1 rounded text-xs font-medium border transition-all',
                      isVisible
                        ? config.color
                        : 'text-muted-foreground border-border bg-transparent opacity-50',
                    )}
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