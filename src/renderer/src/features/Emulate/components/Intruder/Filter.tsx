import { useState, useRef } from 'react';
import { X, Globe, Link } from 'lucide-react';
import { cn } from '../../../../shared/lib/utils';
import { Favicon } from '../../../../shared/utils/faviconUtils';
import { useI18n } from '../../../../i18n/i18nContext';
import { getRequestCategory } from '../../utils/requestHelpers';

export interface NetworkRequest {
  id: string;
  host: string;
  path: string;
  [key: string]: any;
}

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
  const { t } = useI18n();
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
              className="w-full bg-[var(--input-background)] border border-[var(--input-border-default)] hover:border-[var(--input-border-hover)] focus:border-[var(--primary)]/70 rounded px-3 py-2 text-xs focus:bg-[var(--input-background)]/80 outline-none h-10 transition-all text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]"
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
              placeholder={t.networkFilter.filterPlaceholder.replace('{title}', title)}
            />
          </div>
          {showSuggestions && (
            <button
              onClick={() => setShowSuggestions(false)}
              className="bg-[var(--input-background)] hover:bg-[var(--error)]/10 border border-[var(--input-border-default)] hover:border-[var(--error)]/40 rounded text-[var(--text-secondary)] hover:text-[var(--error)] w-10 h-10 flex items-center justify-center transition-colors shrink-0"
              title={t.networkFilter.closeSuggestions}
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {showSuggestions && filteredSuggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              className="absolute top-full mt-1 left-0 right-0 max-h-64 overflow-y-auto bg-[var(--dialog-background)] border border-[var(--divider)] rounded-md shadow-xl z-50"
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
                          ? 'bg-[var(--primary)]/20 text-[var(--primary)] font-medium hover:bg-[var(--primary)]/30'
                          : 'hover:bg-[var(--sidebar-itemHover)]/40 text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
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
                    title={t.networkFilter.removeFilter}
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
  const { t } = useI18n();

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

  // Use CSS variables for colors instead of hardcoded Tailwind classes
  const typeConfig: Record<string, { label: string; color: string; bgColor: string }> = {
    xhr: {
      label: t.networkFilter.types.xhr,
      color: 'var(--accent-cyan)',
      bgColor: 'var(--accent-cyan)',
    },
    js: {
      label: t.networkFilter.types.js,
      color: 'var(--accent-amber)',
      bgColor: 'var(--accent-amber)',
    },
    css: {
      label: t.networkFilter.types.css,
      color: 'var(--accent-blue)',
      bgColor: 'var(--accent-blue)',
    },
    img: {
      label: t.networkFilter.types.img,
      color: 'var(--accent-purple)',
      bgColor: 'var(--accent-purple)',
    },
    media: {
      label: t.networkFilter.types.media,
      color: 'var(--accent-pink)',
      bgColor: 'var(--accent-pink)',
    },
    font: {
      label: t.networkFilter.types.font,
      color: 'var(--accent-orange)',
      bgColor: 'var(--accent-orange)',
    },
    doc: {
      label: t.networkFilter.types.doc,
      color: 'var(--accent-green)',
      bgColor: 'var(--accent-green)',
    },
    ws: {
      label: t.networkFilter.types.ws,
      color: 'var(--accent-teal)',
      bgColor: 'var(--accent-teal)',
    },
    wasm: {
      label: t.networkFilter.types.wasm,
      color: 'var(--accent-violet)',
      bgColor: 'var(--accent-violet)',
    },
    manifest: {
      label: t.networkFilter.types.manifest,
      color: 'var(--accent-lime)',
      bgColor: 'var(--accent-lime)',
    },
    other: {
      label: t.networkFilter.types.other,
      color: 'var(--text-secondary)',
      bgColor: 'var(--text-secondary)',
    },
  };

  const methodColors: Record<string, { color: string; bgColor: string }> = {
    GET: { color: 'var(--accent-blue)', bgColor: 'var(--accent-blue)' },
    POST: { color: 'var(--accent-green)', bgColor: 'var(--accent-green)' },
    PUT: { color: 'var(--accent-orange)', bgColor: 'var(--accent-orange)' },
    PATCH: { color: 'var(--accent-amber)', bgColor: 'var(--accent-amber)' },
    DELETE: { color: 'var(--error)', bgColor: 'var(--error)' },
    HEAD: { color: 'var(--text-secondary)', bgColor: 'var(--text-secondary)' },
    OPTIONS: { color: 'var(--accent-purple)', bgColor: 'var(--accent-purple)' },
    TRACE: { color: 'var(--accent-indigo)', bgColor: 'var(--accent-indigo)' },
    CONNECT: { color: 'var(--accent-rose)', bgColor: 'var(--accent-rose)' },
  };

  return (
    <div className="h-full overflow-y-auto min-h-0 border-l border-border/50 flex flex-col font-sans select-none">
      <div className="p-4 space-y-6">
        {/* Method */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold">{t.networkFilter.method}</h3>
          </div>
          {availableMethods.length === 0 ? (
            <div className="text-xs text-muted-foreground italic px-2">
              {t.networkFilter.noMethods}
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
                    title={isVisible ? t.networkFilter.clickToHide : t.networkFilter.clickToShow}
                  >
                    {key}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Host */}
        <ListFilterSection
          title={t.networkFilter.host}
          lists={filter.host}
          onChange={(newHost) => onChange({ ...filter, host: newHost })}
          allItems={allHosts}
        />

        {/* Status */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold">{t.networkFilter.status}</h3>
          </div>
          {availableStatuses.length === 0 ? (
            <div className="text-xs text-muted-foreground italic px-2">
              {t.networkFilter.noStatuses}
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
                    title={isVisible ? t.networkFilter.clickToHide : t.networkFilter.clickToShow}
                  >
                    {code}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Type */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold">{t.networkFilter.type}</h3>
          </div>
          {availableTypes.length === 0 ? (
            <div className="text-xs text-muted-foreground italic px-2">
              {t.networkFilter.noTypes}
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
                    title={isVisible ? t.networkFilter.clickToHide : t.networkFilter.clickToShow}
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