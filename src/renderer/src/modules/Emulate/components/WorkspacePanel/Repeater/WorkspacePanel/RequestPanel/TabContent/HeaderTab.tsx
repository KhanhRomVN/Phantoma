import { Check, Trash2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

// ── Components ──
import CodeBlock, { CodeBlockRef } from '@renderer/components/common/CodeBlock';

// ── Types ──
import type { ParamItem, PayloadItem } from '../../../../../../types/repeater.types';

// ── Hooks ──
import { useAccentColors } from '@renderer/shared/hooks/useAccentColors';

// ── Utils ──
import { cn } from '@renderer/shared/utils/cn';

interface HeaderTabProps {
  headers: ParamItem[];
  onChange: (headers: ParamItem[]) => void;
  placeholderKey?: string;
  placeholderValue?: string;
  payloads?: PayloadItem[];
  onSwitchToPayload?: () => void;
  readOnly?: boolean;
  isRawView?: boolean;
  targetId?: string | null;
  codeBlockRef?: React.RefObject<CodeBlockRef | null>;
}

export function HeaderTab({
  headers,
  onChange,
  placeholderKey = 'Header name',
  payloads = [],
  onSwitchToPayload,
  readOnly = false,
  isRawView = false,
  targetId = null,
  codeBlockRef,
}: HeaderTabProps) {
  const [isFinalRowEditing, setIsFinalRowEditing] = useState(false);
  const [finalKey, setFinalKey] = useState('');
  const [finalValue, setFinalValue] = useState('');
  const { getColorByIndex } = useAccentColors();
  const [hoveredValue, setHoveredValue] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const hideTooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Store raw JSON text loaded directly from DB
  const [rawJsonText, setRawJsonText] = useState<string>('[]');
  const [isLoadingRawJson, setIsLoadingRawJson] = useState(false);
  
  // Load raw JSON from DB when entering raw view or when repeater-updated event fires
  const loadRawJson = () => {
    console.log('[HeaderTab] loadRawJson() called, targetId:', targetId);
    if (targetId) {
      setIsLoadingRawJson(true);
      import('../../../../../../services/emulate-api.service').then(({ emulateApi }) => {
        console.log('[HeaderTab] loadRawJson - emulateApi imported, fetching...');
        emulateApi.listRequests(targetId).then((res) => {
          console.log('[HeaderTab] loadRawJson - listRequests response:', res);
          if (res.success && res.data && res.data.length > 0) {
            const req = res.data[0];
            const rawJson = req.headers || '[]';
            console.log('[HeaderTab] loadRawJson - Loaded raw JSON from DB:', rawJson);
            setRawJsonText(rawJson);
          }
          setIsLoadingRawJson(false);
        }).catch((err) => {
          console.error('[HeaderTab] loadRawJson - Failed to load raw JSON:', err);
          setIsLoadingRawJson(false);
        });
      });
    } else {
      console.warn('[HeaderTab] loadRawJson - No targetId, skipping');
    }
  };

  useEffect(() => {
    if (isRawView && targetId) {
      loadRawJson();
    }
  }, [isRawView, targetId]);
  
  // Load headers from DB when entering table view or when repeater-updated event fires
  const loadHeaders = () => {
    console.log('[HeaderTab] loadHeaders() called, targetId:', targetId);
    if (targetId) {
      console.log('[HeaderTab] loadHeaders - Reloading headers from DB...');
      import('../../../../../../services/emulate-api.service').then(({ emulateApi }) => {
        console.log('[HeaderTab] loadHeaders - emulateApi imported, fetching...');
        emulateApi.listRequests(targetId).then((res) => {
          console.log('[HeaderTab] loadHeaders - listRequests response:', res);
          if (res.success && res.data && res.data.length > 0) {
            const req = res.data[0];
            const rawJson = req.headers || '[]';
            console.log('[HeaderTab] loadHeaders - Loaded headers JSON from DB:', rawJson);
            
            try {
              const parsed = JSON.parse(rawJson);
              console.log('[HeaderTab] loadHeaders - Parsed JSON:', parsed);
              if (Array.isArray(parsed)) {
                const newHeaders = parsed.map((item) => ({
                  id: item.id || crypto.randomUUID(),
                  key: item.key || '',
                  value: item.value || '',
                  enabled: item.enabled !== undefined ? item.enabled : true,
                }));
                console.log('[HeaderTab] loadHeaders - Converted to ParamItem[]:', newHeaders);
                console.log('[HeaderTab] loadHeaders - Calling onChange...');
                onChange(newHeaders);
                console.log('[HeaderTab] loadHeaders - ✅ onChange called successfully');
              }
            } catch (err) {
              console.error('[HeaderTab] loadHeaders - Failed to parse headers from DB:', err);
            }
          }
        }).catch((err) => {
          console.error('[HeaderTab] loadHeaders - Failed to load headers from DB:', err);
        });
      });
    } else {
      console.warn('[HeaderTab] loadHeaders - No targetId, skipping');
    }
  };

  useEffect(() => {
    if (!isRawView && targetId) {
      console.log('[HeaderTab] Entering table view, reloading headers from DB...');
      loadHeaders();
    }
  }, [isRawView, targetId]);

  // Listen for repeater-updated event to reload data from DB
  useEffect(() => {
    console.log('[HeaderTab] Setting up repeater-updated listener, isRawView:', isRawView, 'targetId:', targetId);
    
    const handleRepeaterUpdated = () => {
      console.log('[HeaderTab] ✅ Received repeater-updated event!');
      console.log('[HeaderTab] Current state - isRawView:', isRawView, 'targetId:', targetId);
      
      if (isRawView) {
        console.log('[HeaderTab] Calling loadRawJson()...');
        loadRawJson();
      } else {
        console.log('[HeaderTab] Calling loadHeaders()...');
        loadHeaders();
      }
    };

    window.addEventListener('repeater-updated', handleRepeaterUpdated);
    console.log('[HeaderTab] Event listener added for repeater-updated');
    
    return () => {
      window.removeEventListener('repeater-updated', handleRepeaterUpdated);
      console.log('[HeaderTab] Event listener removed for repeater-updated');
    };
  }, [isRawView, targetId]);

  // Polling mechanism to check for database changes (fallback if event doesn't work)
  useEffect(() => {
    if (!targetId) return;

    console.log('[HeaderTab] Setting up polling mechanism, targetId:', targetId);
    
    let lastKnownContent = '';
    
    const checkForChanges = async () => {
      if (!targetId) return;
      
      try {
        const { emulateApi } = await import('../../../../../../services/emulate-api.service');
        const res = await emulateApi.listRequests(targetId);
        
        if (res.success && res.data && res.data.length > 0) {
          const req = res.data[0];
          const currentContent = req.headers || '[]';
          
          // Only reload if content actually changed
          if (currentContent !== lastKnownContent && lastKnownContent !== '') {
            console.log('[HeaderTab] 🔄 Database content changed, reloading...');
            console.log('[HeaderTab] Old:', lastKnownContent);
            console.log('[HeaderTab] New:', currentContent);
            
            if (isRawView) {
              loadRawJson();
            } else {
              loadHeaders();
            }
          }
          
          lastKnownContent = currentContent;
        }
      } catch (err) {
        console.error('[HeaderTab] Polling error:', err);
      }
    };
    
    // Initial content snapshot
    (async () => {
      try {
        const { emulateApi } = await import('../../../../../../services/emulate-api.service');
        const res = await emulateApi.listRequests(targetId);
        if (res.success && res.data && res.data.length > 0) {
          lastKnownContent = res.data[0].headers || '[]';
          console.log('[HeaderTab] Initial content snapshot:', lastKnownContent);
        }
      } catch (err) {
        console.error('[HeaderTab] Error getting initial snapshot:', err);
      }
    })();
    
    // Poll every 2 seconds
    const intervalId = setInterval(checkForChanges, 2000);
    
    return () => {
      clearInterval(intervalId);
      console.log('[HeaderTab] Polling stopped');
    };
  }, [targetId, isRawView]);

  const hasPayloadVariable = (value: string): boolean => {
    return /\$\{[^}]+\}/.test(value);
  };

  // Hash payload name to consistent accent color index
  const getPayloadColorByName = (name: string): string => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = (hash << 5) - hash + name.charCodeAt(i);
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
  const highlightText = (value: string, getColor: (name: string) => string): React.ReactNode => {
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
  }, [headers]);

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
    const newHeader: ParamItem = {
      id: crypto.randomUUID(),
      key: key.trim(),
      value: value.trim(),
      enabled: true,
    };
    const newHeaders = [...headers, newHeader];
    console.log('[HeaderTab] handleAdd called, newHeaders:', newHeaders);
    onChange(newHeaders);
  };

  const handleToggle = (id: string) => {
    if (readOnly) return;
    onChange(headers.map((h) => (h.id === id ? { ...h, enabled: !h.enabled } : h)));
  };

  const handleDelete = (id: string) => {
    if (readOnly) return;
    onChange(headers.filter((h) => h.id !== id));
  };

  const fallbackAccentColor = getColorByIndex(0);
  
  // Detect duplicate keys
  const getDuplicateKeys = (): Set<string> => {
    const keyCount = new Map<string, number>();
    headers.forEach((header) => {
      if (header.key?.trim()) {
        keyCount.set(header.key, (keyCount.get(header.key) || 0) + 1);
      }
    });
    
    const duplicates = new Set<string>();
    keyCount.forEach((count, key) => {
      if (count > 1) {
        duplicates.add(key);
      }
    });
    
    return duplicates;
  };
  
  const duplicateKeys = getDuplicateKeys();

  const handleRawChange = (newJson: string) => {
    console.log('[HeaderTab] handleRawChange called');
    console.log('[HeaderTab] newJson:', newJson);
    console.log('[HeaderTab] targetId:', targetId);
    
    // Update local state immediately for responsive UI
    setRawJsonText(newJson);
    
    // Save raw JSON directly to database
    if (targetId) {
      console.log('[HeaderTab] targetId exists, attempting to save raw JSON...');
      
      import('../../../../../../services/emulate-api.service').then(({ emulateApi }) => {
        console.log('[HeaderTab] emulateApi imported, fetching requests...');
        
        emulateApi.listRequests(targetId).then((res) => {
          console.log('[HeaderTab] listRequests response:', res);
          
          if (res.success && res.data && res.data.length > 0) {
            const req = res.data[0];
            console.log('[HeaderTab] Found request:', req.id);
            console.log('[HeaderTab] Calling updateRequest with raw JSON...');
            
            emulateApi.updateRequest(targetId, req.id, { headers: newJson }).then((updateRes) => {
              console.log('[HeaderTab] updateRequest response:', updateRes);
              
              if (updateRes.success) {
                console.log('[HeaderTab] ✅ Raw JSON saved successfully');
                
                // Also try to parse and update headers for table view
                try {
                  const parsed = JSON.parse(newJson);
                  if (Array.isArray(parsed)) {
                    const newHeaders = parsed.map((item) => ({
                      id: item.id || crypto.randomUUID(),
                      key: item.key || '',
                      value: item.value || '',
                      enabled: item.enabled !== undefined ? item.enabled : true,
                    }));
                    onChange(newHeaders);
                  }
                } catch {
                  console.log('[HeaderTab] JSON parse failed, table view will reload from DB');
                }
              } else {
                console.error('[HeaderTab] ❌ Failed to save raw JSON:', updateRes.error);
              }
            }).catch((err) => {
              console.error('[HeaderTab] ❌ updateRequest exception:', err);
            });
          } else {
            console.warn('[HeaderTab] ⚠️ No requests found or response failed');
          }
        }).catch((err) => {
          console.error('[HeaderTab] ❌ listRequests exception:', err);
        });
      }).catch((err) => {
        console.error('[HeaderTab] ❌ Failed to import emulateApi:', err);
      });
    } else {
      console.log('[HeaderTab] ⚠️ No targetId, skipping raw JSON save');
    }
  };

  // If raw view, render CodeBlock instead of table
  if (isRawView) {
    console.log('[HeaderTab] Raw view - rawJsonText:', rawJsonText);
    console.log('[HeaderTab] Raw view - isLoadingRawJson:', isLoadingRawJson);
    
    if (isLoadingRawJson) {
      return (
        <div key="raw-view" className="h-full w-full relative flex items-center justify-center">
          <div className="text-text-secondary">Loading...</div>
        </div>
      );
    }
    
    return (
      <div key="raw-view" className="h-full w-full relative">
        <div className="absolute inset-0">
          <CodeBlock
            ref={codeBlockRef}
            code={rawJsonText}
            onChange={readOnly ? undefined : handleRawChange}
            language="json"
            className="w-full h-full"
            showLineNumbers={false}
            wordWrap="on"
          />
        </div>
      </div>
    );
  }

  return (
    <div key="table-view" className="flex flex-col h-full relative">
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

      <div className="flex-1 overflow-y-auto overflow-x-hidden pb-60">
        <table className="w-full text-xs table-auto">
          <thead className="sticky top-0 bg-table-headerBg border-b border-border z-10">
            <tr>
              <th className="w-8 px-2 py-1.5 text-left text-text-secondary font-medium">#</th>
              <th className="w-[180px] px-2 py-1.5 text-left text-text-secondary font-medium">
                Key
              </th>
              <th className="px-2 py-1.5 text-left text-text-secondary font-medium">Value</th>
              <th className="w-16 px-2 py-1.5 text-center text-text-secondary font-medium">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {headers.length === 0
              ? null
              : headers.map((header) => {
                  const hasVar = hasPayloadVariable(header.value);
                  const match = hasVar ? header.value.match(/\$\{([^}]+)\}/) : null;
                  const firstPayloadName = match ? match[1] : null;
                  const varColor = firstPayloadName
                    ? getPayloadColorByName(firstPayloadName)
                    : hasVar
                      ? fallbackAccentColor
                      : undefined;

                  return (
                    <tr
                      key={header.id}
                      className={cn(
                        'border-b border-border/40 hover:bg-dropdown-item-hover/30 transition-colors',
                        !header.enabled && 'opacity-50',
                      )}
                    >
                      <td className="px-2 py-1.5">
                        <button
                          onClick={() => handleToggle(header.id)}
                          className={cn(
                            'w-4 h-4 rounded border flex items-center justify-center transition-all',
                            readOnly && 'cursor-default',
                            header.enabled
                              ? 'bg-primary border-primary '
                              : 'border-border bg-background',
                          )}
                        >
                          {header.enabled && (
                            <Check className="w-2.5 h-2.5 stroke-[3] text-text-foreground" />
                          )}
                        </button>
                      </td>
                      <td className="px-2 py-0">
                        <input
                          type="text"
                          value={header.key}
                          onChange={(e) => {
                            if (readOnly) return;
                            const updated = headers.map((h) =>
                              h.id === header.id ? { ...h, key: e.target.value } : h,
                            );
                            onChange(updated);
                          }}
                          readOnly={readOnly}
                          className={cn(
                            "w-full bg-transparent px-1.5 py-1.5 text-sm text-text-primary outline-none font-mono",
                            duplicateKeys.has(header.key) && header.key.trim() && "outline outline-2 outline-dashed outline-warning"
                          )}
                          placeholder={placeholderKey}
                        />
                      </td>
                      <td className="px-2 py-0">
                        <div className="relative">
                          <div
                            ref={(el) => {
                              if (el) overlayRefs.current.set(header.id, el);
                              else overlayRefs.current.delete(header.id);
                            }}
                            className="absolute inset-0 px-1.5 py-1.5 text-sm font-mono leading-relaxed break-words whitespace-pre-wrap pointer-events-none overflow-hidden"
                            aria-hidden="true"
                          >
                            {highlightText(header.value, getPayloadColorByName)}
                          </div>
                          <textarea
                            ref={(el) => {
                              if (el) {
                                textareaRefs.current.set(header.id, el);
                                resizeTextarea(el);
                              } else {
                                textareaRefs.current.delete(header.id);
                              }
                            }}
                            value={header.value}
                            onChange={(e) => {
                              if (readOnly) return;
                              const newValue = e.target.value;
                              const updated = headers.map((h) =>
                                h.id === header.id ? { ...h, value: newValue } : h,
                              );
                              onChange(updated);
                              requestAnimationFrame(() => {
                                const el = textareaRefs.current.get(header.id);
                                if (el) resizeTextarea(el);
                              });
                            }}
                            onInput={(e) => {
                              if (readOnly) return;
                              const target = e.target as HTMLTextAreaElement;
                              resizeTextarea(target);
                            }}
                            onScroll={(e) => {
                              const overlay = overlayRefs.current.get(header.id);
                              if (overlay) {
                                overlay.scrollTop = e.currentTarget.scrollTop;
                                overlay.scrollLeft = e.currentTarget.scrollLeft;
                              }
                            }}
                            onMouseEnter={(e) => handleMouseEnter(header.value, e)}
                            onMouseLeave={handleMouseLeave}
                            readOnly={readOnly}
                            className="w-full bg-transparent px-1.5 py-1.5 text-sm outline-none break-words resize-none font-mono leading-relaxed overflow-hidden relative"
                            style={{
                              color: 'transparent',
                              caretColor: varColor || 'var(--text-primary)',
                            }}
                            placeholder=""
                          />
                        </div>
                      </td>
                      <td className="px-2 py-1.5 align-top">
                        <div className="flex items-center justify-center">
                          <button
                            onClick={() => handleDelete(header.id)}
                            disabled={readOnly}
                            className="p-1 rounded hover:bg-error/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Delete header"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-text-secondary hover:text-error" />
                          </button>
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
                    className="w-full bg-transparent border-none outline-none text-sm text-text-primary placeholder:text-text-secondary italic py-1.5 px-1.5"
                    placeholder="Key"
                  />
                </td>
                <td className="px-2 py-0">
                  <input
                    type="text"
                    value={isFinalRowEditing ? finalValue : ''}
                    onChange={(e) => {
                      if (!finalKey.trim()) return;
                      setFinalValue(e.target.value);
                      if (!isFinalRowEditing) setIsFinalRowEditing(true);
                    }}
                    onFocus={(e) => {
                      if (!finalKey.trim()) {
                        e.target.blur();
                        return;
                      }
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
                    className="w-full bg-transparent border-none outline-none text-sm text-text-primary placeholder:text-text-secondary italic py-1.5 px-1.5 break-words disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Value"
                    disabled={!finalKey.trim()}
                  />
                </td>
                <td className="px-2 py-1.5"></td>
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
                <div className="text-[10px] text-text-secondary italic">
                  No payload variables found
                </div>
              ) : (
                <div className="space-y-2">
                  {names.map((name) => {
                    const payload = getPayloadByName(name);
                    const color = getPayloadColorByName(name);
                    return (
                      <div
                        key={name}
                        className="border-t border-border/40 pt-2 first:border-t-0 first:pt-0"
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="font-mono text-[11px] font-medium" style={{ color }}>
                            {'${' + name + '}'}
                          </span>
                        </div>
                        {payload && payload.values.length > 0 ? (
                          <div className="text-[10px] text-text-secondary">
                            <span className="font-medium">{payload.values.length} values</span>
                            <div className="font-mono bg-background/50 rounded p-1 mt-0.5 max-h-20 overflow-y-auto">
                              {payload.values.slice(0, 5).map((v, i) => (
                                <div key={i} className="truncate">
                                  {v}
                                </div>
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
