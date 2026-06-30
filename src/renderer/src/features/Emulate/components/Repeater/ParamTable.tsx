import { useState, useRef, useEffect } from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../../../shared/lib/utils';
import { useAccentColors } from '../../../../shared/hooks/useAccentColors';

interface ParamItem {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

interface ParamTableProps {
  params: ParamItem[];
  onChange: (params: ParamItem[]) => void;
  placeholderKey?: string;
  placeholderValue?: string;
  payloads?: Array<{ id: string; name: string; values: string[]; enabled: boolean }>;
  onSwitchToPayload?: () => void;
}

export function ParamTable({
  params,
  onChange,
  placeholderKey = 'Key',
  placeholderValue = 'Value',
  payloads = [],
  onSwitchToPayload,
}: ParamTableProps) {
  const [isFinalRowEditing, setIsFinalRowEditing] = useState(false);
  const [finalKey, setFinalKey] = useState('');
  const [finalValue, setFinalValue] = useState('');
  const { getColorByIndex } = useAccentColors();
  const [hoveredValue, setHoveredValue] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const hideTooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Function to check if value contains payload variable
  const hasPayloadVariable = (value: string): boolean => {
    return /\$\{[^}]+\}/.test(value);
  };

  // Function to get color for payload variable
  const getPayloadColor = (value: string): string | undefined => {
    if (hasPayloadVariable(value)) {
      return getColorByIndex(0); // Use first accent color
    }
    return undefined;
  };

  // Extract payload name from ${name}
  const extractPayloadName = (value: string): string | null => {
    const match = value.match(/\$\{([^}]+)\}/);
    return match ? match[1] : null;
  };

  // Get payload by name
  const getPayloadByName = (name: string) => {
    return payloads.find((p) => p.name === name && p.enabled);
  };

  // Handle mouse enter on textarea
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

  // Handle mouse leave with delay
  const handleMouseLeave = () => {
    hideTooltipTimeoutRef.current = setTimeout(() => {
      setHoveredValue(null);
      setTooltipPosition(null);
    }, 200); // 200ms delay
  };

  // Handle tooltip mouse enter (keep it visible)
  const handleTooltipMouseEnter = () => {
    if (hideTooltipTimeoutRef.current) {
      clearTimeout(hideTooltipTimeoutRef.current);
      hideTooltipTimeoutRef.current = null;
    }
  };

  // Handle tooltip mouse leave
  const handleTooltipMouseLeave = () => {
    setHoveredValue(null);
    setTooltipPosition(null);
  };
  const textareaRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());
  const measurerRef = useRef<HTMLDivElement>(null);

  // Resize all textareas after render
  useEffect(() => {
    textareaRefs.current.forEach((el) => {
      resizeTextarea(el);
    });
  }, [params]);

  // Function to resize a single textarea using hidden measurer
  const resizeTextarea = (el: HTMLTextAreaElement) => {
    if (!measurerRef.current) return;

    // Get computed style from textarea
    const computed = window.getComputedStyle(el);
    const textareaWidth = el.clientWidth; // Use clientWidth (excludes border, includes padding)

    // Set measurer to match textarea exactly
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
    measurerRef.current.style.whiteSpace = computed.whiteSpace; // Use textarea's whiteSpace
    measurerRef.current.style.boxSizing = 'border-box';

    // Copy the text to measurer div
    measurerRef.current.textContent = el.value || '';

    // Get the actual rendered height
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
    onChange(params.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p)));
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Hidden measurer div */}
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
                            const updated = params.map((p) =>
                              p.id === param.id ? { ...p, key: e.target.value } : p,
                            );
                            onChange(updated);
                          }}
                          className="w-full bg-transparent px-1.5 py-1.5 text-xs text-text-primary outline-none font-mono"
                          placeholder={placeholderKey}
                        />
                      </td>
                      <td className="px-2 py-0">
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
                            const updated = params.map((p) =>
                              p.id === param.id ? { ...p, value: e.target.value } : p,
                            );
                            onChange(updated);
                            // Resize after state update
                            requestAnimationFrame(() => {
                              const el = textareaRefs.current.get(param.id);
                              if (el) resizeTextarea(el);
                            });
                          }}
                          onInput={(e) => {
                            const target = e.target as HTMLTextAreaElement;
                            resizeTextarea(target);
                          }}
                          onMouseEnter={(e) => handleMouseEnter(param.value, e)}
                          onMouseLeave={handleMouseLeave}
                          className="w-full bg-transparent px-1.5 py-1.5 text-xs outline-none break-words resize-none font-mono leading-relaxed overflow-hidden"
                          style={{
                            color: getPayloadColor(param.value) || undefined,
                          }}
                          placeholder={placeholderValue}
                        />
                      </td>
                    </tr>
                  );
                })}
            {/* Final row with placeholders - inline input style */}
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
          </tbody>
        </table>
      </div>

      {/* Tooltip for payload variables */}
      {hoveredValue &&
        tooltipPosition &&
        (() => {
          const payloadName = extractPayloadName(hoveredValue);
          const payload = payloadName ? getPayloadByName(payloadName) : null;

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
              <div className="text-xs font-medium text-text-primary mb-1">
                Payload:{' '}
                <span style={{ color: getColorByIndex(0) }}>${'{' + payloadName + '}'}</span>
              </div>
              {payload ? (
                <div className="text-[10px] text-text-secondary">
                  <div className="font-medium mb-1">{payload.values.length} values:</div>
                  <div className="font-mono bg-background/50 rounded p-1.5 max-h-32 overflow-y-auto">
                    {payload.values.slice(0, 10).map((v, i) => (
                      <div key={i}>{v}</div>
                    ))}
                    {payload.values.length > 10 && (
                      <div className="text-text-secondary italic">
                        ... and {payload.values.length - 10} more
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-[10px] text-warning">
                  ⚠️ Payload not found or has no values.{' '}
                  <button onClick={onSwitchToPayload} className="text-primary hover:underline">
                    Click here to configure
                  </button>
                </div>
              )}
            </div>
          );
        })()}
    </div>
  );
}
