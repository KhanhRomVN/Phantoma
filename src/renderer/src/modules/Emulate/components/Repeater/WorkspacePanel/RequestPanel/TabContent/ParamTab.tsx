import { Check } from 'lucide-react';
import { cn } from '../../../../../../../shared/lib/utils';
import { useAccentColors } from '../../../../../../../shared/hooks/useAccentColors';
import type { ParamItem, PayloadItem } from '../types';
import { useState, useRef, useEffect } from 'react';

interface ParamTabProps {
  params: ParamItem[];
  onChange: (params: ParamItem[]) => void;
  placeholderKey?: string;
  placeholderValue?: string;
  payloads?: PayloadItem[];
  onSwitchToPayload?: () => void;
  readOnly?: boolean;
}

export function ParamTab({
  params,
  onChange,
  placeholderKey = 'Key',
  placeholderValue = 'Value',
  payloads = [],
  onSwitchToPayload,
  readOnly = false,
}: ParamTabProps) {
  const [isFinalRowEditing, setIsFinalRowEditing] = useState(false);
  const [finalKey, setFinalKey] = useState('');
  const [finalValue, setFinalValue] = useState('');
  const { getColorByIndex } = useAccentColors();
  const [hoveredValue, setHoveredValue] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const hideTooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const hasPayloadVariable = (value: string): boolean => {
    return /\$\{[^}]+\}/.test(value);
  };

  // Hash payload name to consistent accent color index
  const getPayloadColorByName = (name: string): string => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = ((hash << 5) - hash) + name.charCodeAt(i);
      hash |= 0;
    }
    return getColorByIndex(Math.abs(hash));
  };

  // Extract all unique payload names from a value string
  const extractPayloadNames = (value: string): string[] => {
    const names = new Set<string>();
    const RE = /\$\{([^}]+)\}/g;
    let match: RegExpExecArray | null;
    while ((match = RE.exec(value)) !== null) {
      names.add(match[1]);
    }
    return [...names];
  };

  // Get payload by name
  const getPayloadByName = (name: string) => {
    return payloads.find((p) => p.name === name && p.enabled);
  };

  // Highlight text: split by ${...} and color each variable by its name
  const RE_PAYLOAD_VAR = /\$\{[^}]+\}/;
  const highlightText = (
    value: string,
    getColor: (name: string) => string,
  ): React.ReactNode => {
    if (!value) return null;
    const parts = value.split(/(\$\{[^}]+\})/g);
    return parts.map((part, i) => {
      if (part.startsWith('${') && part.endsWith('}') && RE_PAYLOAD_VAR.test(part)) {
        const name = part.slice(2, -1);
        return (
          <span key={i} style={{ color: getColor(name) }}>
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  const handleMouseEnter = (value: string, e: React.MouseEvent<HTMLTextAreaElement>) => {
    if (hideTooltipTimeoutRef.current) {
      clearTimeout(hideTooltipTimeoutRef.current);
      hideTooltipTimeoutRef.current = null;
    }
    if (hasPayloadVariable(value)) {
      setHoveredValue(value);
      const rect = e.currentTarget.getBoundingClientRect();
      setTooltipPosition({ x: rect.left, y: rect.bottom + 5 });
    }
  };

  const handleMouseLeave = () => {
    hideTooltipTimeoutRef.current = setTimeout(() => {
      setHoveredValue(null);
      setTooltipPosition(null);
    }, 200);
  };

  const handleTooltipMouseEnter = () => {
    if (hideTooltipTimeoutRef.current) {
      clearTimeout(hideTooltipTimeoutRef.current);
      hideTooltipTimeoutRef.current = null;
    }
  };

  const handleTooltipMouseLeave = () => {
    setHoveredValue(null);
    setTooltipPosition(null);
  };

  const textareaRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());
  const overlayRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const measurerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    textareaRefs.current.forEach((el) => {
      resizeTextarea(el);
    });
  }, [params]);

  const resizeTextarea = (el: HTMLTextAreaElement) => {
    if (!measurerRef.current) return;

    const computed = window.getComputedStyle(el);
    const textareaWidth = el.clientWidth;

    measurerRef.current.style.width = textareaWidth + 'px';
    measurerRef.current.style.paddingLeft = computed.paddingLeft;
    measurerRef.current.style.paddingRight = computed.paddingRight;
    measurerRef.current.style.paddingTop = computed.paddingTop;
    measurerRef.current.style.paddingBottom = computed.paddingBottom;
    measurerRef.current.style.lineHeight = computed.lineHeight;
    measurerRef.current.style.fontSize = computed.fontSize;
    measurerRef.current.style.fontFamily = computed.fontFamily;
    measurerRef.current.style.wordBreak = computed.wordBreak;
    measurerRef.current.style.overflowWrap = computed.overflowWrap;
    measurerRef.current.style.whiteSpace = computed.whiteSpace;
    measurerRef.current.style.boxSizing = 'border-box';

    measurerRef.current.textContent = el.value || '';

    const measuredHeight = measurerRef.current.offsetHeight;
    el.style.height = measuredHeight + 'px';
  };

  const handleAdd = (key: string, value: string) => {
    const newParam: ParamItem = {
      id: crypto.randomUUID(),
      key: key.trim(),
      value: value.trim(),
      enabled: true,
    };
    onChange([...params, newParam]);
  };

  const handleToggle = (id: string) => {
    if (readOnly) return;
    onChange(params.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p)));
  };

  const fallbackAccentColor = getColorByIndex(0);

  return (
    <div className="flex flex-col h-full relative">
      <div
        ref={measurerRef}
        className="absolute pointer-events-none"
        style={{
          visibility: 'hidden',
          top: -9999,
          left: -9999,
          whiteSpace: 'pre-wrap',
        }}
        aria-hidden="true"
      />

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <table className="w-full text-xs table-auto">
          <thead className="sticky top-0 bg-table-headerBg border-b border-border z-10">
            <tr>
              <th className="w-8 px-2 py-1.5 text-left text-text-secondary font-medium">#</th>
              <th className="w-[180px] px-2 py-1.5 text-left text-text-secondary font-medium">
                Key
              </th>
              <th className="px-2 py-1.5 text-left text-text-secondary font-medium">Value</th>
            </tr>
          </thead>
          <tbody>
            {params.length === 0
              ? null
              : params.map((param) => {
                  const hasVar = hasPayloadVariable(param.value);
                  const match = hasVar ? param.value.match(/\$\{([^}]+)\}/) : null;
                  const firstPayloadName = match ? match[1] : null;
                  const varColor = firstPayloadName
                    ? getPayloadColorByName(firstPayloadName)
                    : hasVar
                      ? fallbackAccentColor
                      : undefined;

                  return (
                    <tr
                      key={param.id}
                      className={cn(
                        'border-b border-border/40 hover:bg-dropdown-item-hover/30 transition-colors',
                        !param.enabled && 'opacity-50',
                      )}
                    >
                      <td className="px-2 py-1.5">
                        <button
                          onClick={() => handleToggle(param.id)}
                          className={cn(
                            'w-4 h-4 rounded border flex items-center justify-center transition-all',
                            readOnly && 'cursor-default',
                            param.enabled
                              ? 'bg-primary border-primary '
                              : 'border-border bg-background',
                          )}
                        >
                          {param.enabled && (
                            <Check className="w-2.5 h-2.5 stroke-[3] text-text-foreground" />
                          )}
                        </button>
                      </td>
                      <td className="px-2 py-0">
                        <input
                          type="text"
                          value={param.key}
                          onChange={(e) => {
                            if (readOnly) return;
                            const updated = params.map((p) =>
                              p.id === param.id ? { ...p, key: e.target.value } : p,
                            );
                            onChange(updated);
                          }}
                          readOnly={readOnly}
                          className="w-full bg-transparent px-1.5 py-1.5 text-xs text-text-primary outline-none font-mono"
                          placeholder={placeholderKey}
                        />
                      </td>
                      <td className="px-2 py-0">
                        <div className="relative">
                          <div
                            ref={(el) => {
                              if (el) overlayRefs.current.set(param.id, el);
                              else overlayRefs.current.delete(param.id);
                            }}
                            className="absolute inset-0 px-1.5 py-1.5 text-xs font-mono leading-relaxed break-words whitespace-pre-wrap pointer-events-none overflow-hidden"
                            aria-hidden="true"
                          >
                            {param.value ? (
                              highlightText(param.value, getPayloadColorByName)
                            ) : (
                              <span className="text-text-secondary italic">{placeholderValue}</span>
                            )}
                          </div>
                          <textarea
                            ref={(el) => {
                              if (el) {
                                textareaRefs.current.set(param.id, el);
                                resizeTextarea(el);
                              } else {
                                textareaRefs.current.delete(param.id);
                              }
                            }}
                            value={param.value}
                            onChange={(e) => {
                              if (readOnly) return;
                              const newValue = e.target.value;
                              const updated = params.map((p) =>
                                p.id === param.id ? { ...p, value: newValue } : p,
                              );
                              onChange(updated);
                              requestAnimationFrame(() => {
                                const el = textareaRefs.current.get(param.id);
                                if (el) resizeTextarea(el);
                              });
                            }}
                            onInput={(e) => {
                              if (readOnly) return;
                              const target = e.target as HTMLTextAreaElement;
                              resizeTextarea(target);
                            }}
                            onScroll={(e) => {
                              const overlay = overlayRefs.current.get(param.id);
                              if (overlay) {
                                overlay.scrollTop = e.currentTarget.scrollTop;
                                overlay.scrollLeft = e.currentTarget.scrollLeft;
                              }
                            }}
                            onMouseEnter={(e) => handleMouseEnter(param.value, e)}
                            onMouseLeave={handleMouseLeave}
                            readOnly={readOnly}
                            className="w-full bg-transparent px-1.5 py-1.5 text-xs outline-none break-words resize-none font-mono leading-relaxed overflow-hidden relative"
                            style={{
                              color: 'transparent',
                              caretColor: varColor || undefined,
                            }}
                            placeholder=""
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
            {!readOnly && (
              <tr className="border-b border-border/40 hover:bg-dropdown-item-hover/30 transition-colors">
                <td className="px-2 py-1.5"></td>
                <td className="px-2 py-0">
                  <input
                    type="text"
                    value={isFinalRowEditing ? finalKey : ''}
                    onChange={(e) => {
                      setFinalKey(e.target.value);
                      if (!isFinalRowEditing) setIsFinalRowEditing(true);
                    }}
                    onFocus={() => {
                      if (!isFinalRowEditing) setIsFinalRowEditing(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (finalKey.trim() || finalValue.trim())) {
                        handleAdd(finalKey, finalValue);
                        setFinalKey('');
                        setFinalValue('');
                        setIsFinalRowEditing(false);
                      } else if (e.key === 'Escape') {
                        setIsFinalRowEditing(false);
                        setFinalKey('');
                        setFinalValue('');
                      }
                    }}
                    onBlur={() => {
                      if (finalKey.trim() || finalValue.trim()) {
                        handleAdd(finalKey, finalValue);
                      }
                      setFinalKey('');
                      setFinalValue('');
                      setIsFinalRowEditing(false);
                    }}
                    className="w-full bg-transparent border-none outline-none text-xs text-text-primary placeholder:text-text-secondary italic py-1.5"
                    placeholder="Key"
                  />
                </td>
                <td className="px-2 py-0">
                  <input
                    type="text"
                    value={isFinalRowEditing ? finalValue : ''}
                    onChange={(e) => {
                      setFinalValue(e.target.value);
                      if (!isFinalRowEditing) setIsFinalRowEditing(true);
                    }}
                    onFocus={() => {
                      if (!isFinalRowEditing) setIsFinalRowEditing(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && finalKey.trim() && finalValue.trim()) {
                        handleAdd(finalKey, finalValue);
                        setFinalKey('');
                        setFinalValue('');
                        setIsFinalRowEditing(false);
                      } else if (e.key === 'Escape') {
                        setIsFinalRowEditing(false);
                        setFinalKey('');
                        setFinalValue('');
                      }
                    }}
                    onBlur={() => {
                      if (finalKey.trim() && finalValue.trim()) {
                        handleAdd(finalKey, finalValue);
                      }
                      setFinalKey('');
                      setFinalValue('');
                      setIsFinalRowEditing(false);
                    }}
                    className="w-full bg-transparent border-none outline-none text-xs text-text-primary placeholder:text-text-secondary italic py-1.5 break-words"
                    placeholder="Value"
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Tooltip showing all payloads found in hovered value */}
      {hoveredValue &&
        tooltipPosition &&
        (() => {
          const names = extractPayloadNames(hoveredValue);

          return (
            <div
              className="fixed z-50 bg-background border border-border rounded-lg shadow-xl p-3 max-w-xs"
              style={{
                left: tooltipPosition.x,
                top: tooltipPosition.y,
              }}
              onMouseEnter={handleTooltipMouseEnter}
              onMouseLeave={handleTooltipMouseLeave}
            >
              <div className="text-xs font-medium text-text-primary mb-2">
                Payloads in this value:
              </div>
              {names.length === 0 ? (
                <div className="text-[10px] text-text-secondary italic">No payload variables found</div>
              ) : (
                <div className="space-y-2">
                  {names.map((name) => {
                    const payload = getPayloadByName(name);
                    const color = getPayloadColorByName(name);
                    return (
                      <div key={name} className="border-t border-border/40 pt-2 first:border-t-0 first:pt-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span
                            className="font-mono text-[11px] font-medium"
                            style={{ color }}
                          >
                            {'${' + name + '}'}
                          </span>
                        </div>
                        {payload && payload.values.length > 0 ? (
                          <div className="text-[10px] text-text-secondary">
                            <span className="font-medium">{payload.values.length} values</span>
                            <div className="font-mono bg-background/50 rounded p-1 mt-0.5 max-h-20 overflow-y-auto">
                              {payload.values.slice(0, 5).map((v, i) => (
                                <div key={i} className="truncate">{v}</div>
                              ))}
                              {payload.values.length > 5 && (
                                <div className="text-text-secondary italic">
                                  ... and {payload.values.length - 5} more
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="text-[10px] text-warning">
                            {'No values. '}
                            <button
                              onClick={onSwitchToPayload}
                              className="text-primary hover:underline"
                            >
                              Click to configure
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}
    </div>
  );
}